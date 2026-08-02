import {
  ModePaiement,
  Prisma,
  StatutDemande,
  StatutPaiement,
  StatutVerificationCni,
} from "@prisma/client";

import { AppError } from "../errors/AppError";

import {
  DemandeRepository,
} from "../repositories/demande.repository";

import {
  PaiementRepository,
} from "../repositories/paiement.repository";

import {
  UserRepository,
} from "../repositories/user.repository";

import type {
  CreatePaiementDto,
} from "../validations/paiement.validation";

export class PaiementService {
  private static readonly PREFIX_RECU =
    "REC";

  private paiementRepository =
    new PaiementRepository();

  private demandeRepository =
    new DemandeRepository();

  private userRepository =
    new UserRepository();

  /**
   * Génère un numéro de reçu unique.
   *
   * Exemple :
   * REC-2026-000001
   */
  private async generateNumeroRecu():
    Promise<string> {
    const year =
      new Date().getFullYear();

    const lastPaiement =
      await this.paiementRepository
        .findLastNumeroRecu(year);

    if (!lastPaiement) {
      return `${PaiementService.PREFIX_RECU}-${year}-000001`;
    }

    const expression =
      /^REC-\d{4}-(\d{6})$/;

    const match =
      lastPaiement.numeroRecu
        .match(expression);

    if (!match || !match[1]) {
      throw new AppError(
        "Le dernier numéro de reçu est invalide.",
        500
      );
    }

    const lastNumber =
      Number(match[1]);

    if (
      Number.isNaN(lastNumber)
    ) {
      throw new AppError(
        "Le dernier numéro de reçu est invalide.",
        500
      );
    }

    const nextNumber =
      String(
        lastNumber + 1
      ).padStart(6, "0");

    return `${PaiementService.PREFIX_RECU}-${year}-${nextNumber}`;
  }

  /**
   * Enregistre le paiement total
   * d’une demande.
   */
  async create(
    demandeId: string,
    data: CreatePaiementDto,
    caissierId: string,
    role: string
  ) {
    /*
     * Seul le Caissier ou l’Administrateur
     * peut enregistrer un paiement.
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

    /*
     * Vérification de l’utilisateur qui
     * réalise l’encaissement.
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

    /*
     * Vérification de la demande.
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

    /*
     * Le paiement intervient avant la
     * transmission au Responsable.
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

    /*
     * L’identité doit être vérifiée avant
     * l’encaissement.
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

    /*
     * Une demande ne peut avoir qu’un seul
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

    /*
     * Conversion des montants en Decimal.
     *
     * Cela évite les imprécisions des
     * nombres JavaScript.
     */
    const montantExigible =
      new Prisma.Decimal(
        demande.montantTotal
          .toString()
      );

    const montantRemis =
      new Prisma.Decimal(
        data.montantRemis
      );

    /*
     * Le paiement partiel est interdit.
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

    /*
     * Le montant encaissé correspond
     * toujours au montant exigible.
     *
     * La différence est rendue au citoyen.
     */
    const montantEncaisse =
      montantExigible;

    const monnaieRendue =
      montantRemis.minus(
        montantExigible
      );

    /*
     * Génération du numéro de reçu seulement
     * après validation des règles métier.
     */
    const numeroRecu =
      await this.generateNumeroRecu();

    try {
      return await this
        .paiementRepository
        .create({
          numeroRecu,

          montantExigible,

          montantRemis,

          monnaieRendue,

          montantEncaisse,

          modePaiement:
            ModePaiement.ESPECES,

          statut:
            StatutPaiement.PAYE,

          /*
           * La conversion du montant en lettres
           * sera ajoutée lors de la génération
           * du reçu.
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
        });
    } catch (error) {
      /*
       * Protection contre la création
       * simultanée de deux reçus identiques
       * ou de deux paiements pour la même
       * demande.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
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
   * Consulte le paiement d’une demande.
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

    /*
     * L’Agent ne peut consulter que le
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

    /*
     * Le Responsable ne peut pas consulter
     * une demande encore conservée chez
     * l’Agent.
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
   * Consulte un paiement par son identifiant.
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