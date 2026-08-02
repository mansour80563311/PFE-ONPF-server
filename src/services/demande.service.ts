import {
  LangueCertificat,
  StatutDemande,
  StatutDocument,
  StatutPaiement,
  StatutVerificationCni,
  TypeDocument,
} from "@prisma/client";

import type {
  Prisma,
} from "@prisma/client";

import { AppError } from "../errors/AppError";

import {
  DemandeDocumentRepository,
} from "../repositories/demande-document.repository";

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
  CreateDemandeServiceDto,
  ListDemandesDto,
  UpdateDemandeDto,
} from "../validations/demande.validation";

import {
  CniService,
} from "./cni.service";

interface DemandeAccessData {
  utilisateurId: string;
  statut: StatutDemande;
}

/*
 * Tarification actuelle du certificat.
 *
 * Ces valeurs sont définies côté backend
 * afin qu’elles ne puissent pas être
 * modifiées depuis le frontend.
 */
const PRIX_UNITAIRE_CERTIFICAT =
  30;

const SUPPLEMENT_TRADUCTION =
  40;

export class DemandeService {
  private static readonly PREFIX =
    "DF";

  private demandeRepository =
    new DemandeRepository();

  private userRepository =
    new UserRepository();

  private documentRepository =
    new DemandeDocumentRepository();

  private paiementRepository =
    new PaiementRepository();

  private cniService =
    new CniService();

  /**
   * Filtre appliqué à la liste des demandes
   * selon le rôle de l’utilisateur connecté.
   */
  private buildListAccessFilter(
    utilisateurId: string,
    role: string
  ): Prisma.DemandeWhereInput {
    if (role === "ADMIN") {
      return {};
    }

    if (role === "AGENT") {
      return {
        utilisateurId,
      };
    }

    if (role === "CAISSIER") {
      return {
        statut:
          StatutDemande.EN_ATTENTE,

        paiement: {
          is: null,
        },
      };
    }

    if (role === "RESPONSABLE") {
      return {
        statut:
          StatutDemande.EN_COURS,
      };
    }


    throw new AppError(
      "Rôle utilisateur non autorisé.",
      403
    );
  }

  /**
   * Vérifie l’autorisation de consulter
   * une demande précise.
   */
  private assertCanReadDemande(
    demande: DemandeAccessData,
    utilisateurId: string,
    role: string
  ): void {
    if (role === "ADMIN") {
      return;
    }

    if (
      role === "AGENT" &&
      demande.utilisateurId ===
        utilisateurId
    ) {
      return;
    }
      /*
   * Le Caissier peut consulter une demande
   * tant qu’elle est encore à l’étape
   * EN_ATTENTE.
   */
    if (
      role === "CAISSIER" &&
      demande.statut ===
        StatutDemande.EN_ATTENTE
    ) {
      return;
    }

    if (
      role === "RESPONSABLE" &&
      demande.statut !==
        StatutDemande.EN_ATTENTE
    ) {
      return;
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à accéder à cette demande.",
      403
    );
  }

  /**
   * Calcule la tarification d’une demande.
   *
   * Formule :
   *
   * nombre d’exemplaires × 30 DT
   * + 40 DT lorsqu’une traduction
   * est demandée.
   */
  private calculateTarification(
    nombreExemplaires: number,
    langueCertificat:
      LangueCertificat,
    traductionDemandee: boolean
  ) {
    if (
      !Number.isInteger(
        nombreExemplaires
      ) ||
      nombreExemplaires < 1
    ) {
      throw new AppError(
        "Le nombre d’exemplaires doit être un entier supérieur ou égal à 1.",
        400
      );
    }

    /*
     * Le français est considéré comme
     * la langue de base.
     */
    if (
      traductionDemandee &&
      langueCertificat ===
        LangueCertificat.FRANCAIS
    ) {
      throw new AppError(
        "Une traduction ne peut pas être demandée vers la langue française.",
        400
      );
    }

    /*
     * Une langue différente du français
     * nécessite obligatoirement l’option
     * de traduction.
     */
    if (
      !traductionDemandee &&
      langueCertificat !==
        LangueCertificat.FRANCAIS
    ) {
      throw new AppError(
        "La traduction doit être sélectionnée pour un certificat en arabe ou en anglais.",
        400
      );
    }

    const prixUnitaire =
      PRIX_UNITAIRE_CERTIFICAT;

    const supplementTraduction =
      traductionDemandee
        ? SUPPLEMENT_TRADUCTION
        : 0;

    const montantTotal =
      nombreExemplaires *
        prixUnitaire +
      supplementTraduction;

    return {
      nombreExemplaires,
      langueCertificat,
      traductionDemandee,
      prixUnitaire,
      supplementTraduction,
      montantTotal,
    };
  }

  /**
   * Génère automatiquement le numéro
   * de la prochaine demande.
   */
  private async generateNumero():
    Promise<string> {
    const lastDemande =
      await this.demandeRepository
        .findLastNumero();

    const year =
      new Date().getFullYear();

    if (!lastDemande) {
      return `${DemandeService.PREFIX}-${year}-000001`;
    }

    const parts =
      lastDemande.numero.split("-");

    const lastNumber =
      Number(parts[2]);

    if (
      Number.isNaN(lastNumber)
    ) {
      throw new AppError(
        "Le numéro de demande est invalide.",
        500
      );
    }

    const nextNumber = String(
      lastNumber + 1
    ).padStart(6, "0");

    return `${DemandeService.PREFIX}-${year}-${nextNumber}`;
  }

  /**
   * Crée une nouvelle demande.
   */
  async create(
    data: CreateDemandeServiceDto,
    role: string
  ) {
    if (
      role !== "ADMIN" &&
      role !== "AGENT"
    ) {
      throw new AppError(
        "Seul un agent peut créer une demande.",
        403
      );
    }

    const utilisateur =
      await this.userRepository
        .findById(
          data.utilisateurId
        );

    if (!utilisateur) {
      throw new AppError(
        "Utilisateur introuvable.",
        404
      );
    }

    const existing =
      await this.demandeRepository
        .findByCinAndReference(
          data.cin,
          data.referenceFonciere
        );

    if (existing) {
      throw new AppError(
        "Une demande existe déjà pour ce demandeur et cette référence foncière.",
        409
      );
    }

    /*
     * Le backend vérifie lui-même le CIN.
     *
     * Les données d’identité envoyées par
     * le frontend ne sont pas considérées
     * comme fiables.
     */
    const identite =
      await this.cniService
        .verifierIdentite(
          data.cin
        );

    if (!identite) {
      throw new AppError(
        "Aucune identité trouvée pour ce numéro CIN.",
        404
      );
    }

    /*
     * Le calcul est réalisé côté serveur.
     */
    const tarification =
      this.calculateTarification(
        data.nombreExemplaires,
        data.langueCertificat,
        data.traductionDemandee
      );

    const numero =
      await this.generateNumero();

    const dateVerificationCni =
      new Date();

    return this.demandeRepository
      .create({
        numero,

        /*
         * Informations officielles retournées
         * par le service CNI.
         */
        nomDemandeur:
          identite.nom,

        prenomDemandeur:
          identite.prenom,

        cin:
          identite.cin,

        dateNaissanceDemandeur:
          identite.dateNaissance,

        adresseDemandeur:
          identite.adresse,

        statutVerificationCni:
          StatutVerificationCni.VERIFIEE,

        dateVerificationCni,

        sourceVerificationCni:
          "SERVICE_CNI_SIMULE",

        referenceVerificationCni:
          identite.referenceVerification,

        messageVerificationCni:
          "Identité vérifiée avec succès.",

        /*
         * Informations tarifaires.
         */
        nombreExemplaires:
          tarification
            .nombreExemplaires,

        langueCertificat:
          tarification
            .langueCertificat,

        traductionDemandee:
          tarification
            .traductionDemandee,

        prixUnitaire:
          tarification
            .prixUnitaire,

        supplementTraduction:
          tarification
            .supplementTraduction,

        montantTotal:
          tarification
            .montantTotal,

        telephone:
          data.telephone,

        email:
          data.email || null,

        referenceFonciere:
          data.referenceFonciere,

        adresseBien:
          data.adresseBien,

        observations:
          data.observations || null,

        statut:
          StatutDemande.EN_ATTENTE,

        utilisateur: {
          connect: {
            id:
              data.utilisateurId,
          },
        },
      });
  }

  /**
   * Liste les demandes accessibles à
   * l’utilisateur connecté.
   */
  async findAll(
    query: ListDemandesDto,
    utilisateurId: string,
    role: string
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const accessFilter =
      this.buildListAccessFilter(
        utilisateurId,
        role
      );

    const result =
      await this.demandeRepository
        .findAll(
          page,
          limit,
          search,
          accessFilter
        );

    return {
      demandes:
        result.data,

      meta: {
        total:
          result.total,

        page:
          result.page,

        limit:
          result.limit,

        totalPages:
          result.totalPages,
      },
    };
  }

  /**
   * Recherche une demande par son ID.
   */
  async findById(
    id: string,
    utilisateurId: string,
    role: string
  ) {
    const demande =
      await this.demandeRepository
        .findById(id);

    if (!demande) {
      throw new AppError(
        "Demande introuvable.",
        404
      );
    }

    this.assertCanReadDemande(
      demande,
      utilisateurId,
      role
    );

    return demande;
  }

  /**
   * Modifie une demande encore autorisée.
   */
  async update(
    id: string,
    data: UpdateDemandeDto,
    utilisateurId: string,
    role: string
  ) {
    const demande =
      await this.findById(
        id,
        utilisateurId,
        role
      );

    const isAdmin =
      role === "ADMIN";

    const isAgent =
      role === "AGENT";

    if (
      !isAdmin &&
      !isAgent
    ) {
      throw new AppError(
        "Seul un agent peut modifier une demande.",
        403
      );
    }

    if (
      demande.statut ===
        StatutDemande.VALIDEE ||
      demande.statut ===
        StatutDemande.REJETEE
    ) {
      throw new AppError(
        "Une demande terminée ne peut plus être modifiée.",
        400
      );
    }

    if (
      isAgent &&
      demande.statut !==
        StatutDemande.EN_ATTENTE
    ) {
      throw new AppError(
        "Une demande transmise ne peut plus être modifiée par l’agent.",
        400
      );
    }

    /*
    * Une demande déjà payée ne peut plus être
    * modifiée afin de préserver la cohérence
    * entre le reçu et les informations tarifaires.
    */
    const paiementExistant =
      await this.paiementRepository
        .findByDemandeId(id);

    if (paiementExistant) {
      throw new AppError(
        "Une demande déjà payée ne peut plus être modifiée.",
        400
      );
    }

    const identityFieldsProvided =
      data.cin !== undefined ||
      data.nomDemandeur !==
        undefined ||
      data.prenomDemandeur !==
        undefined;

    const identityUpdate:
      Prisma.DemandeUpdateInput =
        {};

    /*
     * Lorsqu’un champ d’identité est modifié,
     * le CIN est revérifié.
     */
    if (identityFieldsProvided) {
      const cinToVerify =
        data.cin ??
        demande.cin;

      const identite =
        await this.cniService
          .verifierIdentite(
            cinToVerify
          );

      if (!identite) {
        throw new AppError(
          "Aucune identité trouvée pour ce numéro CIN.",
          404
        );
      }

      identityUpdate.cin =
        identite.cin;

      identityUpdate.nomDemandeur =
        identite.nom;

      identityUpdate.prenomDemandeur =
        identite.prenom;

      identityUpdate
        .dateNaissanceDemandeur =
          identite.dateNaissance;

      identityUpdate.adresseDemandeur =
        identite.adresse;

      identityUpdate
        .statutVerificationCni =
          StatutVerificationCni.VERIFIEE;

      identityUpdate
        .dateVerificationCni =
          new Date();

      identityUpdate
        .sourceVerificationCni =
          "SERVICE_CNI_SIMULE";

      identityUpdate
        .referenceVerificationCni =
          identite.referenceVerification;

      identityUpdate
        .messageVerificationCni =
          "Identité vérifiée avec succès.";
    }

    const cinFinal =
      identityFieldsProvided
        ? data.cin ??
          demande.cin
        : demande.cin;

    const referenceFinal =
      data.referenceFonciere ??
      demande.referenceFonciere;

    /*
     * Vérification de l’unicité du CIN
     * et de la référence foncière.
     */
    if (
      data.cin !== undefined ||
      data.referenceFonciere !==
        undefined
    ) {
      const existing =
        await this.demandeRepository
          .findByCinAndReference(
            cinFinal,
            referenceFinal
          );

      if (
        existing &&
        existing.id !== id
      ) {
        throw new AppError(
          "Une demande existe déjà pour ce demandeur et cette référence foncière.",
          409
        );
      }
    }

    /*
     * Le montant est recalculé lorsqu’un
     * paramètre tarifaire est modifié.
     */
    const tarificationFieldsProvided =
      data.nombreExemplaires !==
        undefined ||
      data.langueCertificat !==
        undefined ||
      data.traductionDemandee !==
        undefined;

    const tarificationUpdate =
      tarificationFieldsProvided
        ? this.calculateTarification(
            data.nombreExemplaires ??
              demande
                .nombreExemplaires,

            data.langueCertificat ??
              demande
                .langueCertificat,

            data.traductionDemandee ??
              demande
                .traductionDemandee
          )
        : null;

    return this.demandeRepository
      .update(
        id,
        {
          ...identityUpdate,

          ...(tarificationUpdate
            ? {
                nombreExemplaires:
                  tarificationUpdate
                    .nombreExemplaires,

                langueCertificat:
                  tarificationUpdate
                    .langueCertificat,

                traductionDemandee:
                  tarificationUpdate
                    .traductionDemandee,

                prixUnitaire:
                  tarificationUpdate
                    .prixUnitaire,

                supplementTraduction:
                  tarificationUpdate
                    .supplementTraduction,

                montantTotal:
                  tarificationUpdate
                    .montantTotal,
              }
            : {}),

          ...(data.telephone !==
            undefined && {
            telephone:
              data.telephone,
          }),

          ...(data.referenceFonciere !==
            undefined && {
            referenceFonciere:
              data.referenceFonciere,
          }),

          ...(data.adresseBien !==
            undefined && {
            adresseBien:
              data.adresseBien,
          }),

          ...(data.email !==
            undefined && {
            email:
              data.email || null,
          }),

          ...(data.observations !==
            undefined && {
            observations:
              data.observations ||
              null,
          }),
        }
      );
  }

  /**
   * Vérifie les documents nécessaires
   * avant la validation d’une demande.
   */
  private async verifyDocumentsBeforeValidation(
    demandeId: string
  ): Promise<void> {
    const documents =
      await this.documentRepository
        .findForValidation(
          demandeId
        );

    const identityDocument =
      documents.find(
        (document) =>
          document.type ===
            TypeDocument.CIN ||
          document.type ===
            TypeDocument.PASSEPORT
      );

    const contrat =
      documents.find(
        (document) =>
          document.type ===
          TypeDocument.CONTRAT
      );

    const procuration =
      documents.find(
        (document) =>
          document.type ===
          TypeDocument.PROCURATION
      );

    const piecesManquantes:
      string[] = [];

    const piecesNonConformes:
      string[] = [];

    if (!identityDocument) {
      piecesManquantes.push(
        "CIN ou passeport"
      );
    } else if (
      identityDocument.statut !==
      StatutDocument.CONFORME
    ) {
      piecesNonConformes.push(
        "CIN ou passeport"
      );
    }

    if (!contrat) {
      piecesManquantes.push(
        "contrat"
      );
    } else if (
      contrat.statut !==
      StatutDocument.CONFORME
    ) {
      piecesNonConformes.push(
        "contrat"
      );
    }

    if (!procuration) {
      piecesManquantes.push(
        "procuration"
      );
    } else if (
      procuration.statut !==
      StatutDocument.CONFORME
    ) {
      piecesNonConformes.push(
        "procuration"
      );
    }

    if (
      piecesManquantes.length > 0 ||
      piecesNonConformes.length > 0
    ) {
      const details:
        string[] = [];

      if (
        piecesManquantes.length > 0
      ) {
        details.push(
          `Pièces manquantes : ${piecesManquantes.join(
            ", "
          )}.`
        );
      }

      if (
        piecesNonConformes.length >
        0
      ) {
        details.push(
          `Pièces non conformes ou non vérifiées : ${piecesNonConformes.join(
            ", "
          )}.`
        );
      }

      throw new AppError(
        `La demande ne peut pas être validée. ${details.join(
          " "
        )}`,
        400
      );
    }
  }

  /**
   * Vérifie ou régularise le CIN d’une
   * demande existante.
   */
  async verifierCni(
    id: string,
    utilisateurId: string,
    role: string
  ) {
    if (
      role !== "ADMIN" &&
      role !== "AGENT"
    ) {
      throw new AppError(
        "Seul un agent peut vérifier l’identité CNI d’une demande.",
        403
      );
    }

    const demande =
      await this.findById(
        id,
        utilisateurId,
        role
      );

    if (
      demande.statut !==
      StatutDemande.EN_ATTENTE
    ) {
      throw new AppError(
        "Seule une demande en attente peut faire l’objet d’une vérification CNI.",
        400
      );
    }

    const dateVerificationCni =
      new Date();

    try {
      const identite =
        await this.cniService
          .verifierIdentite(
            demande.cin
          );

      if (!identite) {
        await this.demandeRepository
          .update(
            id,
            {
              statutVerificationCni:
                StatutVerificationCni.ECHEC,

              dateVerificationCni,

              sourceVerificationCni:
                "SERVICE_CNI_SIMULE",

              referenceVerificationCni:
                null,

              messageVerificationCni:
                "Aucune identité trouvée pour ce numéro CIN.",
            }
          );

        throw new AppError(
          "Aucune identité trouvée pour ce numéro CIN.",
          404
        );
      }

      return this.demandeRepository
        .update(
          id,
          {
            cin:
              identite.cin,

            nomDemandeur:
              identite.nom,

            prenomDemandeur:
              identite.prenom,

            dateNaissanceDemandeur:
              identite.dateNaissance,

            adresseDemandeur:
              identite.adresse,

            statutVerificationCni:
              StatutVerificationCni.VERIFIEE,

            dateVerificationCni,

            sourceVerificationCni:
              "SERVICE_CNI_SIMULE",

            referenceVerificationCni:
              identite
                .referenceVerification,

            messageVerificationCni:
              "Identité vérifiée avec succès.",
          }
        );
    } catch (error) {
      if (
        error instanceof AppError
      ) {
        throw error;
      }

      await this.demandeRepository
        .update(
          id,
          {
            statutVerificationCni:
              StatutVerificationCni.INDISPONIBLE,

            dateVerificationCni,

            sourceVerificationCni:
              "SERVICE_CNI_SIMULE",

            referenceVerificationCni:
              null,

            messageVerificationCni:
              "Le service CNI est temporairement indisponible.",
          }
        );

      throw new AppError(
        "Le service CNI est temporairement indisponible.",
        503
      );
    }
  }

  /**
   * Met à jour le statut d’une demande.
   */
  async updateStatus(
    id: string,
    nouveauStatut: StatutDemande,
    utilisateurId: string,
    role: string,
    motifRejet?: string
  ) {
    const demande =
      await this.findById(
        id,
        utilisateurId,
        role
      );

    const isAdmin =
      role === "ADMIN";

    const isAgent =
      role === "AGENT";

    const isResponsable =
      role === "RESPONSABLE";

    if (
      nouveauStatut ===
        StatutDemande.EN_COURS &&
      !isAdmin &&
      !isAgent
    ) {
      throw new AppError(
        "Seul un agent peut transmettre une demande au responsable.",
        403
      );
    }

    if (
      (
        nouveauStatut ===
          StatutDemande.VALIDEE ||
        nouveauStatut ===
          StatutDemande.REJETEE
      ) &&
      !isAdmin &&
      !isResponsable
    ) {
      throw new AppError(
        "Seul un responsable peut valider ou rejeter une demande.",
        403
      );
    }

    if (
      isAgent &&
      nouveauStatut ===
        StatutDemande.EN_COURS &&
      demande.utilisateurId !==
        utilisateurId
    ) {
      throw new AppError(
        "Vous ne pouvez transmettre que vos propres demandes.",
        403
      );
    }

    /*
     * L’identité doit être vérifiée avant
     * la transmission au Responsable.
     */
    if (
      nouveauStatut ===
        StatutDemande.EN_COURS &&
      demande.statutVerificationCni !==
        StatutVerificationCni.VERIFIEE
    ) {
      throw new AppError(
        "La demande ne peut pas être transmise tant que l’identité CNI n’est pas vérifiée.",
        400
      );
    }

    /*
     * Le paiement doit être confirmé avant :
     * - la transmission au Responsable ;
     * - la validation de la demande ;
     * - le rejet de la demande.
     *
     * Le contrôle sur VALIDEE et REJETEE
     * protège également les anciennes
     * demandes qui auraient été transmises
     * avant l’intégration de la caisse.
     */
    const paiementObligatoire =
      nouveauStatut ===
        StatutDemande.EN_COURS ||
      nouveauStatut ===
        StatutDemande.VALIDEE ||
      nouveauStatut ===
        StatutDemande.REJETEE;

    if (paiementObligatoire) {
      const paiement =
        await this.paiementRepository
          .findByDemandeId(id);

      if (!paiement) {
        throw new AppError(
          "La demande ne peut pas poursuivre son traitement tant que le paiement n’est pas effectué.",
          400
        );
      }

      if (
        paiement.statut !==
        StatutPaiement.PAYE
      ) {
        throw new AppError(
          "La demande ne peut pas poursuivre son traitement car son paiement n’est pas valide.",
          400
        );
      }
    }

    const transitionsAutorisees:
      Record<
        StatutDemande,
        StatutDemande[]
      > = {
        [StatutDemande.EN_ATTENTE]:
          [
            StatutDemande.EN_COURS,
          ],

        [StatutDemande.EN_COURS]:
          [
            StatutDemande.VALIDEE,
            StatutDemande.REJETEE,
          ],

        [StatutDemande.VALIDEE]:
          [],

        [StatutDemande.REJETEE]:
          [],
      };

    const transitionAutorisee =
      transitionsAutorisees[
        demande.statut
      ].includes(
        nouveauStatut
      );

    if (!transitionAutorisee) {
      throw new AppError(
        `Le passage du statut ${demande.statut} vers ${nouveauStatut} n'est pas autorisé.`,
        400
      );
    }

    if (
      nouveauStatut ===
        StatutDemande.REJETEE &&
      !motifRejet?.trim()
    ) {
      throw new AppError(
        "Le motif de rejet est obligatoire.",
        400
      );
    }

    if (
      nouveauStatut ===
      StatutDemande.VALIDEE
    ) {
      await this
        .verifyDocumentsBeforeValidation(
          id
        );
    }

    return this.demandeRepository
      .updateStatusWithHistory({
        id,

        ancienStatut:
          demande.statut,

        nouveauStatut,

        utilisateurId,

        motifRejet:
          nouveauStatut ===
          StatutDemande.REJETEE
            ? motifRejet!.trim()
            : null,
      });
  }

  /**
   * Supprime une demande encore modifiable.
   */
  async delete(
    id: string,
    utilisateurId: string,
    role: string
  ) {
    const demande =
      await this.findById(
        id,
        utilisateurId,
        role
      );

    const isAdmin =
      role === "ADMIN";

    const isAgent =
      role === "AGENT";

    if (
      !isAdmin &&
      !isAgent
    ) {
      throw new AppError(
        "Seul un agent peut supprimer une demande.",
        403
      );
    }

    if (
      demande.statut ===
        StatutDemande.VALIDEE ||
      demande.statut ===
        StatutDemande.REJETEE
    ) {
      throw new AppError(
        "Une demande terminée ne peut plus être supprimée.",
        400
      );
    }

    if (
      isAgent &&
      demande.statut !==
        StatutDemande.EN_ATTENTE
    ) {
      throw new AppError(
        "Une demande transmise ne peut plus être supprimée par l’agent.",
        400
      );
    }

    /*
    * Un paiement et son reçu doivent rester
    * conservés pour garantir la traçabilité
    * financière.
    */
    const paiementExistant =
      await this.paiementRepository
        .findByDemandeId(id);

    if (paiementExistant) {
      throw new AppError(
        "Une demande déjà payée ne peut plus être supprimée.",
        400
      );
    }

    return this.demandeRepository
      .delete(id);
  }

  /**
   * Retourne l’historique des statuts.
   */
  async findHistory(
    id: string,
    utilisateurId: string,
    role: string
  ) {
    await this.findById(
      id,
      utilisateurId,
      role
    );

    return this.demandeRepository
      .findHistoryByDemandeId(id);
  }
}