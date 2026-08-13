import {
  ModePaiement,
  Prisma,
  StatutDemande,
  StatutPaiement,
  StatutTarification,
  StatutVerificationCni,
  TypeDocument,
} from "@prisma/client";

import { AppError } from "../errors/AppError";

import {
  DemandeRepository,
} from "../repositories/demande.repository";

import {
  PaiementRepository,
} from "../repositories/paiement.repository";

import {
  DemandeDocumentRepository,
} from "../repositories/demande-document.repository";

import {
  UserRepository,
} from "../repositories/user.repository";

import type {
  CreatePaiementDto,
} from "../validations/paiement.validation";

import {
  JournalCaisseService,
} from "./journal-caisse.service";


export class PaiementService {
  private static readonly PREFIX_RECU =
    "REC";

  private paiementRepository =
    new PaiementRepository();

  private demandeRepository =
    new DemandeRepository();

  private userRepository =
    new UserRepository();

  private documentRepository =
    new DemandeDocumentRepository();

  private journalCaisseService =
    new JournalCaisseService();


  /**
   * ========================================================
   * VERIFICATION DES PIECES AVANT ENCAISSEMENT
   * ========================================================
   *
   * Le paiement fige la demande et verrouille les pièces.
   * On impose donc que le dossier documentaire soit complet
   * avant l'encaissement.
   *
   * Pièces obligatoires :
   *
   * - une pièce d'identité : CIN ou PASSEPORT ;
   * - le CONTRAT ;
   * - la PROCURATION.
   *
   * La conformité n'est pas contrôlée ici :
   * elle relève du Responsable lorsque la demande est EN_COURS.
   */
  private async assertRequiredDocumentsPresent(
    demandeId: string
  ): Promise<void> {
    const documents =
      await this.documentRepository
        .findAllByDemandeId(
          demandeId
        );


    const hasIdentityDocument =
      documents.some(
        (document) =>
          document.type ===
            TypeDocument.CIN ||
          document.type ===
            TypeDocument.PASSEPORT
      );


    const hasContrat =
      documents.some(
        (document) =>
          document.type ===
          TypeDocument.CONTRAT
      );


    const hasProcuration =
      documents.some(
        (document) =>
          document.type ===
          TypeDocument.PROCURATION
      );


    const missingDocuments:
      string[] = [];


    if (!hasIdentityDocument) {
      missingDocuments.push(
        "CIN ou passeport"
      );
    }


    if (!hasContrat) {
      missingDocuments.push(
        "contrat"
      );
    }


    if (!hasProcuration) {
      missingDocuments.push(
        "procuration"
      );
    }


    if (
      missingDocuments.length >
      0
    ) {
      throw new AppError(
        `La demande ne peut pas être encaissée car le dossier documentaire est incomplet. Pièce(s) manquante(s) : ${missingDocuments.join(
          ", "
        )}.`,
        400
      );
    }
  }


  /**
   * ========================================================
   * GENERATION DU NUMERO DE RECU
   * ========================================================
   *
   * Exemple :
   *
   * REC-2026-000001
   */
  private async generateNumeroRecu():
    Promise<string> {
    const year =
      new Date().getFullYear();


    const lastPaiement =
      await this.paiementRepository
        .findLastNumeroRecu(
          year
        );


    if (!lastPaiement) {
      return `${PaiementService.PREFIX_RECU}-${year}-000001`;
    }


    const expression =
      /^REC-\d{4}-(\d{6})$/;


    const match =
      lastPaiement.numeroRecu
        .match(
          expression
        );


    if (
      !match ||
      !match[1]
    ) {
      throw new AppError(
        "Le dernier numéro de reçu est invalide.",
        500
      );
    }


    const lastNumber =
      Number(
        match[1]
      );


    if (
      Number.isNaN(
        lastNumber
      )
    ) {
      throw new AppError(
        "Le dernier numéro de reçu est invalide.",
        500
      );
    }


    const nextNumber =
      String(
        lastNumber + 1
      ).padStart(
        6,
        "0"
      );


    return `${PaiementService.PREFIX_RECU}-${year}-${nextNumber}`;
  }


  /**
   * ========================================================
   * CREATION DU PAIEMENT
   * ========================================================
   */
  async create(
    demandeId: string,
    data: CreatePaiementDto,
    caissierId: string,
    role: string
  ) {
    /**
     * ------------------------------------------------------
     * AUTORISATION
     * ------------------------------------------------------
     */
    if (
      role !== "CAISSIER" &&
      role !== "ADMIN"
    ) {
      throw new AppError(
        "Seul un caissier peut enregistrer un paiement.",
        403
      );
    }


    /**
     * ------------------------------------------------------
     * CAISSIER
     * ------------------------------------------------------
     */
    const caissier =
      await this.userRepository
        .findById(
          caissierId
        );


    if (!caissier) {
      throw new AppError(
        "Caissier introuvable.",
        404
      );
    }


    if (!caissier.statut) {
      throw new AppError(
        "Le compte du caissier est désactivé.",
        403
      );
    }


    /**
     * ------------------------------------------------------
     * DEMANDE
     * ------------------------------------------------------
     */
    const demande =
      await this.demandeRepository
        .findById(
          demandeId
        );


    if (!demande) {
      throw new AppError(
        "Demande introuvable.",
        404
      );
    }


    /**
     * Le paiement intervient avant
     * la transmission au Responsable.
     */
    if (
      demande.statut !==
      StatutDemande.EN_ATTENTE
    ) {
      throw new AppError(
        "Seule une demande en attente peut être encaissée.",
        400
      );
    }


    /**
     * L'identité doit être vérifiée
     * avant l'encaissement.
     */
    if (
      demande.statutVerificationCni !==
      StatutVerificationCni.VERIFIEE
    ) {
      throw new AppError(
        "La demande ne peut pas être encaissée tant que l’identité CNI n’est pas vérifiée.",
        400
      );
    }


    /**
     * ------------------------------------------------------
     * COMPLETUDE DU DOSSIER DOCUMENTAIRE
     * ------------------------------------------------------
     *
     * Le paiement verrouille ensuite les documents.
     * On refuse donc l'encaissement tant que toutes
     * les pièces obligatoires ne sont pas déposées.
     */
    await this
      .assertRequiredDocumentsPresent(
        demandeId
      );


    /**
     * ------------------------------------------------------
     * PAIEMENT EXISTANT
     * ------------------------------------------------------
     *
     * Une demande ne peut avoir qu'un seul
     * paiement.
     */
    const existingPaiement =
      await this.paiementRepository
        .findByDemandeId(
          demandeId
        );


    if (existingPaiement) {
      throw new AppError(
        "Cette demande a déjà été payée.",
        409
      );
    }


    /**
     * ======================================================
     * VALIDATION DE LA TARIFICATION
     * ======================================================
     *
     * Pour les nouvelles demandes :
     *
     * TarificationDemande devient la source
     * de vérité du montant exigible.
     *
     * Les anciennes demandes, pour lesquelles
     * nature = null, continuent temporairement
     * à utiliser Demande.montantTotal.
     */
    if (
      demande.nature !== null
    ) {
      if (!demande.tarification) {
        throw new AppError(
          "La demande ne possède aucune tarification réglementaire calculée.",
          500
        );
      }


      /**
       * Une tarification déjà FIGEE ne devrait
       * normalement jamais exister sans paiement.
       *
       * Si cela arrive, on bloque l'encaissement
       * afin de protéger l'intégrité des données.
       */
      if (
        demande.tarification
          .statut !==
        StatutTarification.CALCULEE
      ) {
        throw new AppError(
          "La tarification de cette demande est déjà figée et ne peut pas faire l’objet d’un nouvel encaissement.",
          409
        );
      }
    }


    /**
     * ------------------------------------------------------
     * JOURNAL DE CAISSE
     * ------------------------------------------------------
     *
     * Recherche ou crée automatiquement
     * le journal ouvert du jour.
     *
     * Si le journal a déjà été clôturé,
     * JournalCaisseService bloque
     * l'encaissement.
     */
    const journalCaisse =
      await this
        .journalCaisseService
        .getOrCreateJournalDuJour(
          caissierId
        );


    /**
     * ======================================================
     * MONTANT EXIGIBLE
     * ======================================================
     *
     * Nouvelle demande :
     *
     * TarificationDemande.montantTotal
     *
     * Ancienne demande :
     *
     * Demande.montantTotal
     */
    const montantSource =
      demande.tarification
        ?.montantTotal ??
      demande.montantTotal;


    const montantExigible =
      new Prisma.Decimal(
        montantSource
          .toString()
      );


    const montantRemis =
      new Prisma.Decimal(
        data.montantRemis
      );


    /**
     * ------------------------------------------------------
     * PAIEMENT PARTIEL INTERDIT
     * ------------------------------------------------------
     */
    if (
      montantRemis.lessThan(
        montantExigible
      )
    ) {
      throw new AppError(
        `Le montant remis est insuffisant. Le montant exigible est de ${montantExigible.toFixed(
          3
        )} DT.`,
        400
      );
    }


    /**
     * Le montant encaissé est exactement
     * le montant exigible.
     */
    const montantEncaisse =
      montantExigible;


    /**
     * La différence est rendue
     * au citoyen.
     */
    const monnaieRendue =
      montantRemis.minus(
        montantExigible
      );


    /**
     * ------------------------------------------------------
     * NUMERO DE RECU
     * ------------------------------------------------------
     */
    const numeroRecu =
      await this.generateNumeroRecu();


    /**
     * Une même date est utilisée pour :
     *
     * - le paiement ;
     * - le figage de la tarification.
     *
     * Cela permet une traçabilité exacte.
     */
    const datePaiement =
      new Date();


    try {
      /**
       * ====================================================
       * TRANSACTION
       * ====================================================
       *
       * La création du paiement et le passage
       * CALCULEE -> FIGEE sont atomiques.
       */
      return await this
        .paiementRepository
        .createAndFreezeTarification({
          tarificationId:
            demande.tarification
              ?.id ??
            null,

          dateFigeage:
            datePaiement,

          data: {
            numeroRecu,

            montantExigible,

            montantRemis,

            monnaieRendue,

            montantEncaisse,

            modePaiement:
              ModePaiement.ESPECES,

            statut:
              StatutPaiement.PAYE,

            datePaiement,

            /**
             * La conversion du montant en
             * lettres reste gérée par le
             * module du reçu.
             */
            montantEnLettres:
              null,

            observations:
              data.observations ||
              null,

            demande: {
              connect: {
                id:
                  demandeId,
              },
            },

            caissier: {
              connect: {
                id:
                  caissierId,
              },
            },

            journalCaisse: {
              connect: {
                id:
                  journalCaisse.id,
              },
            },
          },
        });
    } catch (error) {
      /**
       * Protection contre :
       *
       * - deux reçus identiques ;
       * - deux paiements simultanés pour
       *   la même demande.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code ===
          "P2002"
      ) {
        throw new AppError(
          "Le paiement n’a pas pu être enregistré car un reçu ou un paiement identique existe déjà.",
          409
        );
      }


      throw error;
    }
  }


  /**
   * ========================================================
   * CONSULTATION DU PAIEMENT D'UNE DEMANDE
   * ========================================================
   */
  async findByDemandeId(
    demandeId: string,
    utilisateurId: string,
    role: string
  ) {
    const demande =
      await this.demandeRepository
        .findById(
          demandeId
        );


    if (!demande) {
      throw new AppError(
        "Demande introuvable.",
        404
      );
    }


    /**
     * L'Agent ne peut consulter que le
     * paiement de ses propres demandes.
     */
    if (
      role === "AGENT" &&
      demande.utilisateurId !==
        utilisateurId
    ) {
      throw new AppError(
        "Vous n’êtes pas autorisé à consulter le paiement de cette demande.",
        403
      );
    }


    const rolesAutorises = [
      "ADMIN",
      "CAISSIER",
      "AGENT",
      "RESPONSABLE",
    ];


    if (
      !rolesAutorises.includes(
        role
      )
    ) {
      throw new AppError(
        "Vous n’êtes pas autorisé à consulter ce paiement.",
        403
      );
    }


    /**
     * Le Responsable ne peut pas consulter
     * une demande encore chez l'Agent.
     */
    if (
      role === "RESPONSABLE" &&
      demande.statut ===
        StatutDemande.EN_ATTENTE
    ) {
      throw new AppError(
        "Cette demande n’a pas encore été transmise au responsable.",
        403
      );
    }


    const paiement =
      await this.paiementRepository
        .findByDemandeId(
          demandeId
        );


    if (!paiement) {
      throw new AppError(
        "Aucun paiement n’a été enregistré pour cette demande.",
        404
      );
    }


    return paiement;
  }


  /**
   * ========================================================
   * CONSULTATION DIRECTE D'UN PAIEMENT
   * ========================================================
   */
  async findById(
    paiementId: string,
    role: string
  ) {
    if (
      role !== "ADMIN" &&
      role !== "CAISSIER"
    ) {
      throw new AppError(
        "Vous n’êtes pas autorisé à consulter directement ce paiement.",
        403
      );
    }


    const paiement =
      await this.paiementRepository
        .findById(
          paiementId
        );


    if (!paiement) {
      throw new AppError(
        "Paiement introuvable.",
        404
      );
    }


    return paiement;
  }
}