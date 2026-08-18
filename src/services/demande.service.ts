import {
  LangueCertificat,
  NatureDemande,
  Prisma,
  StatutDemande,
  StatutDocument,
  StatutPaiement,
  StatutTarification,
  StatutVerificationCni,
  TypeDocument,
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

import {
  ReferentielService,
} from "./referentiel.service";

import {
  TarificationService,
} from "./tarification.service";

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
      /**
       * ========================================================
       * AUTORISATION
       * ========================================================
       */
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


      /**
       * ========================================================
       * VERIFICATION CNI
       * ========================================================
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


      /**
       * ========================================================
       * NUMERO DE DEMANDE
       * ========================================================
       */
      const numero =
        await this.generateNumero();

      const dateVerificationCni =
        new Date();


      /**
       * Ces variables permettent de construire
       * les relations communes aux deux natures
       * de demande.
       */
      let titreFoncier:
        {
          numero: string;
          gouvernoratId: string;
          gouvernoratCode: string;
        } | null = null;

      let prestation:
        Awaited<
          ReturnType<
            typeof ReferentielService.getPrestationById
          >
        > = null;


      /**
       * ========================================================
       * DEMANDE D'INSCRIPTION
       * ========================================================
       */
      if (
        data.nature ===
        "INSCRIPTION"
      ) {
        const gouvernorat =
          await ReferentielService
            .getGouvernoratById(
              data.gouvernoratId
            );

        if (!gouvernorat) {
          throw new AppError(
            "Gouvernorat introuvable ou inactif.",
            404
          );
        }

        titreFoncier = {
          numero:
            data.numeroTitreFoncier
              .trim(),

          gouvernoratId:
            gouvernorat.id,

          gouvernoratCode:
            gouvernorat.code,
        };
      }


      /**
       * ========================================================
       * DEMANDE DE PRESTATION
       * ========================================================
       */
      if (
        data.nature ===
        "PRESTATION"
      ) {
        prestation =
          await ReferentielService
            .getPrestationById(
              data.prestationId
            );

        if (!prestation) {
          throw new AppError(
            "Prestation introuvable ou inactive.",
            404
          );
        }


        /**
         * Certaines prestations exigent
         * obligatoirement un titre foncier.
         */
        if (
          prestation
            .necessiteTitreFoncier &&
          (
            !data.gouvernoratId ||
            !data.numeroTitreFoncier
          )
        ) {
          throw new AppError(
            "Le gouvernorat et le numéro du titre foncier sont obligatoires pour cette prestation.",
            400
          );
        }


        /**
         * Si un titre foncier a été fourni,
         * nous vérifions le gouvernorat puis
         * construisons la relation.
         */
        if (
          data.gouvernoratId &&
          data.numeroTitreFoncier
        ) {
          const gouvernorat =
            await ReferentielService
              .getGouvernoratById(
                data.gouvernoratId
              );

          if (!gouvernorat) {
            throw new AppError(
              "Gouvernorat introuvable ou inactif.",
              404
            );
          }

          titreFoncier = {
            numero:
              data.numeroTitreFoncier
                .trim(),

            gouvernoratId:
              gouvernorat.id,

            gouvernoratCode:
              gouvernorat.code,
          };
        }
      }


      /**
       * ========================================================
       * CALCUL REGLEMENTAIRE
       * ========================================================
       */
      const tarification =
        data.nature ===
        "INSCRIPTION"
          ? await TarificationService
              .calculer({
                nature:
                  "INSCRIPTION",

                operationFonciereIds:
                  data
                    .operationFonciereIds,
              })
          : await TarificationService
              .calculer({
                nature:
                  "PRESTATION",

                prestationId:
                  data.prestationId,

                nombrePages:
                  data.nombrePages,

                langue:
                  data.langue,
              });


      /**
       * ========================================================
       * COMPATIBILITE AVEC L'ANCIEN MODELE
       * ========================================================
       *
       * referenceFonciere est encore obligatoire
       * dans PostgreSQL.
       *
       * Pour une demande possédant un titre,
       * nous construisons une référence à partir
       * de :
       *
       * numéro + gouvernorat.
       */
      const referenceFonciereLegacy =
        titreFoncier
          ? `${titreFoncier.numero}/${titreFoncier.gouvernoratCode}`
          : `SANS_TITRE-${numero}`;


      /**
       * Le nouveau montant est également copié
       * dans Demande.montantTotal afin que le
       * module Paiement actuel continue à
       * fonctionner pendant la migration.
       */
      const montantTotal =
        new Prisma.Decimal(
          tarification.montantTotal
        );


      /**
       * Valeur utilisée uniquement pour assurer
       * temporairement la compatibilité avec
       * les anciennes interfaces.
       */
      const langueCertificatLegacy =
        data.nature ===
        "PRESTATION"
          ? data.langue ===
            "FRANCAIS"
            ? LangueCertificat.FRANCAIS
            : LangueCertificat.ARABE
          : LangueCertificat.ARABE;


      /**
       * ========================================================
       * CREATION ATOMIQUE
       * ========================================================
       *
       * Prisma créera en une seule opération :
       *
       * - la Demande ;
       * - le TitreFoncier si nécessaire ;
       * - les relations avec les opérations ;
       * - la TarificationDemande ;
       * - les LigneTarification.
       */
      return this.demandeRepository
        .create({
          numero,

          /**
           * Identité officielle issue du
           * service CNI.
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
            identite
              .referenceVerification,

          messageVerificationCni:
            "Identité vérifiée avec succès.",


          /**
           * Données de contact.
           */
          telephone:
            data.telephone,

          email:
            data.email || null,

          adresseBien:
            data.adresseBien,

          observations:
            data.observations || null,


          /**
           * Nouvelle nature métier.
           */
          nature:
            data.nature,


          /**
           * ====================================================
           * ANCIENS CHAMPS CONSERVES TEMPORAIREMENT
           * ====================================================
           */
          referenceFonciere:
            referenceFonciereLegacy,

          nombreExemplaires:
            1,

          langueCertificat:
            langueCertificatLegacy,

          traductionDemandee:
            false,

          /**
           * L'ancien prix unitaire ne représente
           * plus le nouveau modèle réglementaire.
           *
           * Nous recopions temporairement le total
           * afin d'éviter la valeur historique
           * fixe de 30 DT.
           */
          prixUnitaire:
            montantTotal,

          supplementTraduction:
            new Prisma.Decimal(
              0
            ),

          montantTotal,


          /**
           * ====================================================
           * TITRE FONCIER
           * ====================================================
           */
          ...(titreFoncier
            ? {
                titreFoncier: {
                  connectOrCreate: {
                    where: {
                      numero_gouvernoratId:
                        {
                          numero:
                            titreFoncier.numero,

                          gouvernoratId:
                            titreFoncier
                              .gouvernoratId,
                        },
                    },

                    create: {
                      numero:
                        titreFoncier.numero,

                      gouvernorat: {
                        connect: {
                          id:
                            titreFoncier
                              .gouvernoratId,
                        },
                      },
                    },
                  },
                },
              }
            : {}),


          /**
           * ====================================================
           * PRESTATION
           * ====================================================
           */
          ...(data.nature ===
              "PRESTATION" &&
            prestation
            ? {
                prestation: {
                  connect: {
                    id:
                      prestation.id,
                  },
                },

                nombrePages:
                  data.nombrePages ??
                  null,
              }
            : {}),


          /**
           * ====================================================
           * OPERATIONS FONCIERES
           * ====================================================
           */
          ...(data.nature ===
          "INSCRIPTION"
            ? {
                operationsFoncieres: {
                  create:
                    data
                      .operationFonciereIds
                      .map(
                        (
                          typeOperationFonciereId
                        ) => ({
                          typeOperationFonciere:
                            {
                              connect: {
                                id:
                                  typeOperationFonciereId,
                              },
                            },
                        })
                      ),
                },
              }
            : {}),


          /**
           * ====================================================
           * SNAPSHOT TARIFAIRE
           * ====================================================
           */
          tarification: {
            create: {
              nature:
                data.nature,

              prestationCode:
                tarification
                  .prestation
                  ?.code ??
                null,

              prestationLibelle:
                tarification
                  .prestation
                  ?.libelle ??
                null,

              langue:
                data.nature ===
                "PRESTATION"
                  ? data.langue
                  : null,

              nombrePages:
                data.nature ===
                "PRESTATION"
                  ? data.nombrePages ??
                    null
                  : null,

              montantTotal,

              referenceReglementaire:
                tarification
                  .referenceReglementaire,

              lignes: {
                create:
                  tarification
                    .lignes
                    .map(
                      (
                        ligne,
                        index
                      ) => ({
                        type:
                          ligne.type,

                        code:
                          ligne.code,

                        libelle:
                          ligne.libelle,

                        quantite:
                          ligne.quantite,

                        montantUnitaire:
                          new Prisma.Decimal(
                            ligne
                              .montantUnitaire
                          ),

                        montant:
                          new Prisma.Decimal(
                            ligne.montant
                          ),

                        ordre:
                          index + 1,
                      })
                    ),
              },
            },
          },


          /**
           * Cycle de traitement.
           */
          statut:
            StatutDemande.EN_ATTENTE,


          /**
           * Agent ayant créé la demande.
           */
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
    /**
     * ========================================================
     * RECUPERATION DE LA DEMANDE
     * ========================================================
     */
    const demande =
      await this.findById(
        id,
        utilisateurId,
        role
      );


    /**
     * ========================================================
     * AUTORISATIONS
     * ========================================================
     */
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


    /**
     * Une demande terminée ne peut plus
     * être modifiée.
     */
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


    /**
     * Un Agent ne peut modifier que ses
     * demandes encore en attente.
     */
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


    /**
     * ========================================================
     * VERROUILLAGE APRES PAIEMENT
     * ========================================================
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


    /**
     * ========================================================
     * IDENTITE
     * ========================================================
     *
     * Si le CIN, le nom ou le prénom est
     * modifié, l'identité est revérifiée
     * auprès du service CNI.
     */
    const identityFieldsProvided =
      data.cin !== undefined ||
      data.nomDemandeur !==
        undefined ||
      data.prenomDemandeur !==
        undefined;


    const identityUpdate:
      Prisma.DemandeUpdateInput =
        {};


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
          identite
            .referenceVerification;

      identityUpdate
        .messageVerificationCni =
          "Identité vérifiée avec succès.";
    }


    /**
     * ========================================================
     * CHAMPS COMMUNS
     * ========================================================
     */
    const commonUpdate:
      Prisma.DemandeUpdateInput =
        {
          ...identityUpdate,

          ...(data.telephone !==
            undefined && {
            telephone:
              data.telephone,
          }),

          ...(data.email !==
            undefined && {
            email:
              data.email || null,
          }),

          ...(data.adresseBien !==
            undefined && {
            adresseBien:
              data.adresseBien,
          }),

          ...(data.observations !==
            undefined && {
            observations:
              data.observations ||
              null,
          }),
        };


    /**
     * ========================================================
     * ANCIENNES DEMANDES
     * ========================================================
     *
     * Les demandes créées avant la nouvelle
     * architecture possèdent :
     *
     * nature = null
     *
     * Elles continuent temporairement à
     * utiliser l'ancien système.
     */
    if (demande.nature === null) {
      /**
       * Une ancienne demande ne peut pas
       * recevoir les nouveaux paramètres
       * métier par une simple modification.
       */
      const nouveauxChampsFournis =
        data.gouvernoratId !==
          undefined ||
        data.numeroTitreFoncier !==
          undefined ||
        data.operationFonciereIds !==
          undefined ||
        data.prestationId !==
          undefined ||
        data.nombrePages !==
          undefined ||
        data.langue !==
          undefined;


      if (nouveauxChampsFournis) {
        throw new AppError(
          "Cette ancienne demande ne peut pas être migrée automatiquement vers la nouvelle structure lors d'une modification.",
          400
        );
      }


      /**
       * Ancienne tarification.
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
            ...commonUpdate,

            ...(data.referenceFonciere !==
              undefined && {
              referenceFonciere:
                data.referenceFonciere,
            }),

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
          }
        );
    }


    /**
     * ========================================================
     * NOUVELLES DEMANDES
     * ========================================================
     *
     * Les anciens paramètres tarifaires ne
     * sont plus autorisés pour les nouvelles
     * demandes.
     */
    const anciensChampsFournis =
      data.referenceFonciere !==
        undefined ||
      data.nombreExemplaires !==
        undefined ||
      data.langueCertificat !==
        undefined ||
      data.traductionDemandee !==
        undefined;


    if (anciensChampsFournis) {
      throw new AppError(
        "Les anciens paramètres de tarification ne sont plus autorisés pour cette demande.",
        400
      );
    }


    /**
     * ========================================================
     * INSCRIPTION
     * ========================================================
     */
    if (
      demande.nature ===
      NatureDemande.INSCRIPTION
    ) {
      /**
       * Une inscription ne peut pas recevoir
       * des champs spécifiques à une prestation.
       */
      if (
        data.prestationId !==
          undefined ||
        data.nombrePages !==
          undefined ||
        data.langue !==
          undefined
      ) {
        throw new AppError(
          "Les paramètres de prestation ne sont pas autorisés pour une demande d'inscription.",
          400
        );
      }


      /**
       * ------------------------------------------------------
       * TITRE FONCIER FINAL
       * ------------------------------------------------------
       */
      const gouvernoratIdFinal =
        data.gouvernoratId ??
        demande.titreFoncier
          ?.gouvernoratId;


      const numeroTitreFinal =
        data.numeroTitreFoncier
          ?.trim() ??
        demande.titreFoncier
          ?.numero;


      if (
        !gouvernoratIdFinal ||
        !numeroTitreFinal
      ) {
        throw new AppError(
          "Le gouvernorat et le numéro du titre foncier sont obligatoires.",
          400
        );
      }


      const gouvernorat =
        await ReferentielService
          .getGouvernoratById(
            gouvernoratIdFinal
          );


      if (!gouvernorat) {
        throw new AppError(
          "Gouvernorat introuvable ou inactif.",
          404
        );
      }


      /**
       * ------------------------------------------------------
       * OPERATIONS FONCIERES FINALES
       * ------------------------------------------------------
       */
      const operationFonciereIds =
        data.operationFonciereIds ??
        demande
          .operationsFoncieres
          .map(
            (operation) =>
              operation
                .typeOperationFonciereId
          );


      if (
        operationFonciereIds.length ===
        0
      ) {
        throw new AppError(
          "Au moins une opération foncière est obligatoire.",
          400
        );
      }


      /**
       * Le tarif n'est recalculé que si
       * les opérations changent ou si le
       * snapshot tarifaire est absent.
       */
      const recalculerTarification =
        data.operationFonciereIds !==
          undefined ||
        demande.tarification ===
          null;


      const updateData:
        Prisma.DemandeUpdateInput =
          {
            ...commonUpdate,

            referenceFonciere:
              `${numeroTitreFinal}/${gouvernorat.code}`,

            titreFoncier: {
              connectOrCreate: {
                where: {
                  numero_gouvernoratId:
                    {
                      numero:
                        numeroTitreFinal,

                      gouvernoratId:
                        gouvernorat.id,
                    },
                },

                create: {
                  numero:
                    numeroTitreFinal,

                  gouvernorat: {
                    connect: {
                      id:
                        gouvernorat.id,
                    },
                  },
                },
              },
            },
          };


      /**
       * Si les opérations ont changé,
       * on synchronise les associations sans
       * recréer celles qui existent déjà.
       *
       * Exemple :
       * - avant : VENTE
       * - après : VENTE + HYPOTHEQUE
       *
       * VENTE est conservée et HYPOTHEQUE
       * est ajoutée. Cela évite une violation
       * de la contrainte unique :
       *
       * @@unique([demandeId, typeOperationFonciereId])
       */
      if (
        data.operationFonciereIds !==
        undefined
      ) {
        updateData.operationsFoncieres = {
          /**
           * Supprime uniquement les opérations
           * qui ne font plus partie de la nouvelle
           * sélection.
           */
          deleteMany: {
            typeOperationFonciereId: {
              notIn:
                operationFonciereIds,
            },
          },

          /**
           * Ajoute les nouvelles opérations.
           *
           * createMany permet de renseigner
           * directement la clé étrangère, et
           * skipDuplicates évite de recréer une
           * association déjà présente.
           */
          createMany: {
            data:
              operationFonciereIds
                .map(
                  (
                    typeOperationFonciereId
                  ) => ({
                    typeOperationFonciereId,
                  })
                ),

            skipDuplicates: true,
          },
        };
      }


      /**
       * ------------------------------------------------------
       * RECALCUL TARIFAIRE
       * ------------------------------------------------------
       */
      if (recalculerTarification) {
        const tarification =
          await TarificationService
            .calculer({
              nature:
                "INSCRIPTION",

              operationFonciereIds,
            });


        const montantTotal =
          new Prisma.Decimal(
            tarification
              .montantTotal
          );


        /**
         * Compatibilité temporaire avec
         * le module Paiement actuel.
         */
        updateData.montantTotal =
          montantTotal;

        updateData.prixUnitaire =
          montantTotal;

        updateData.nombreExemplaires =
          1;

        updateData.traductionDemandee =
          false;

        updateData.supplementTraduction =
          new Prisma.Decimal(0);


        /**
         * Mise à jour du snapshot tarifaire.
         */
        updateData.tarification = {
          upsert: {
            create: {
              nature:
                NatureDemande
                  .INSCRIPTION,

              prestationCode:
                null,

              prestationLibelle:
                null,

              langue:
                null,

              nombrePages:
                null,

              montantTotal,

              referenceReglementaire:
                tarification
                  .referenceReglementaire,

              statut:
                StatutTarification
                  .CALCULEE,

              dateCalcul:
                new Date(),

              dateFigeage:
                null,

              lignes: {
                create:
                  tarification
                    .lignes
                    .map(
                      (
                        ligne,
                        index
                      ) => ({
                        type:
                          ligne.type,

                        code:
                          ligne.code,

                        libelle:
                          ligne.libelle,

                        quantite:
                          ligne.quantite,

                        montantUnitaire:
                          new Prisma.Decimal(
                            ligne
                              .montantUnitaire
                          ),

                        montant:
                          new Prisma.Decimal(
                            ligne.montant
                          ),

                        ordre:
                          index + 1,
                      })
                    ),
              },
            },

            update: {
              nature:
                NatureDemande
                  .INSCRIPTION,

              prestationCode:
                null,

              prestationLibelle:
                null,

              langue:
                null,

              nombrePages:
                null,

              montantTotal,

              referenceReglementaire:
                tarification
                  .referenceReglementaire,

              statut:
                StatutTarification
                  .CALCULEE,

              dateCalcul:
                new Date(),

              dateFigeage:
                null,

              lignes: {
                deleteMany: {},

                create:
                  tarification
                    .lignes
                    .map(
                      (
                        ligne,
                        index
                      ) => ({
                        type:
                          ligne.type,

                        code:
                          ligne.code,

                        libelle:
                          ligne.libelle,

                        quantite:
                          ligne.quantite,

                        montantUnitaire:
                          new Prisma.Decimal(
                            ligne
                              .montantUnitaire
                          ),

                        montant:
                          new Prisma.Decimal(
                            ligne.montant
                          ),

                        ordre:
                          index + 1,
                      })
                    ),
              },
            },
          },
        };
      }


      return this.demandeRepository
        .update(
          id,
          updateData
        );
    }


    /**
     * ========================================================
     * PRESTATION
     * ========================================================
     */
    if (
      demande.nature ===
      NatureDemande.PRESTATION
    ) {
      /**
       * Une prestation ne peut pas contenir
       * d'opérations foncières.
       */
      if (
        data.operationFonciereIds !==
        undefined
      ) {
        throw new AppError(
          "Les opérations foncières ne sont pas autorisées pour une demande de prestation.",
          400
        );
      }


      /**
       * ------------------------------------------------------
       * PRESTATION FINALE
       * ------------------------------------------------------
       */
      const prestationIdFinal =
        data.prestationId ??
        demande.prestationId;


      if (!prestationIdFinal) {
        throw new AppError(
          "La prestation est obligatoire.",
          400
        );
      }


      const prestation =
        await ReferentielService
          .getPrestationById(
            prestationIdFinal
          );


      if (!prestation) {
        throw new AppError(
          "Prestation introuvable ou inactive.",
          404
        );
      }


      /**
       * ------------------------------------------------------
       * TITRE FONCIER FINAL
       * ------------------------------------------------------
       */
      const gouvernoratIdFinal =
        data.gouvernoratId ??
        demande.titreFoncier
          ?.gouvernoratId;


      const numeroTitreFinal =
        data.numeroTitreFoncier
          ?.trim() ??
        demande.titreFoncier
          ?.numero;


      /**
       * Si la prestation nécessite un titre,
       * les deux informations sont obligatoires.
       */
      if (
        prestation
          .necessiteTitreFoncier &&
        (
          !gouvernoratIdFinal ||
          !numeroTitreFinal
        )
      ) {
        throw new AppError(
          "Le gouvernorat et le numéro du titre foncier sont obligatoires pour cette prestation.",
          400
        );
      }


      /**
       * Les deux informations doivent toujours
       * être cohérentes lorsqu'un titre existe.
       */
      if (
        (
          gouvernoratIdFinal &&
          !numeroTitreFinal
        ) ||
        (
          !gouvernoratIdFinal &&
          numeroTitreFinal
        )
      ) {
        throw new AppError(
          "Le gouvernorat et le numéro du titre foncier doivent être renseignés ensemble.",
          400
        );
      }


      let gouvernorat:
        Awaited<
          ReturnType<
            typeof ReferentielService.getGouvernoratById
          >
        > = null;


      if (
        gouvernoratIdFinal &&
        numeroTitreFinal
      ) {
        gouvernorat =
          await ReferentielService
            .getGouvernoratById(
              gouvernoratIdFinal
            );


        if (!gouvernorat) {
          throw new AppError(
            "Gouvernorat introuvable ou inactif.",
            404
          );
        }
      }


      /**
       * ------------------------------------------------------
       * LANGUE FINALE
       * ------------------------------------------------------
       */
      const langueStockee =
        demande.tarification
          ?.langue ??
        demande.langueCertificat;


      const langueFinale:
        "ARABE" | "FRANCAIS" =
          data.langue ??
          (
            langueStockee ===
            LangueCertificat.ARABE
              ? "ARABE"
              : "FRANCAIS"
          );


      /**
       * ------------------------------------------------------
       * NOMBRE DE PAGES
       * ------------------------------------------------------
       */
      const nombrePagesFinal =
        prestation
          .tarificationParPage
          ? (
              data.nombrePages ??
              demande.nombrePages ??
              undefined
            )
          : undefined;


      /**
       * On recalcule uniquement lorsqu'un
       * paramètre tarifaire change.
       */
      const recalculerTarification =
        data.prestationId !==
          undefined ||
        data.nombrePages !==
          undefined ||
        data.langue !==
          undefined ||
        demande.tarification ===
          null;


      const updateData:
        Prisma.DemandeUpdateInput =
          {
            ...commonUpdate,

            prestation: {
              connect: {
                id:
                  prestation.id,
              },
            },

            nombrePages:
              prestation
                .tarificationParPage
                ? nombrePagesFinal ??
                  null
                : null,

            langueCertificat:
              langueFinale ===
              "FRANCAIS"
                ? LangueCertificat
                    .FRANCAIS
                : LangueCertificat
                    .ARABE,

            traductionDemandee:
              false,

            supplementTraduction:
              new Prisma.Decimal(0),
          };


      /**
       * Si un titre foncier est présent,
       * on le normalise et on le rattache.
       */
      if (
        gouvernorat &&
        numeroTitreFinal
      ) {
        updateData.referenceFonciere =
          `${numeroTitreFinal}/${gouvernorat.code}`;


        updateData.titreFoncier = {
          connectOrCreate: {
            where: {
              numero_gouvernoratId:
                {
                  numero:
                    numeroTitreFinal,

                  gouvernoratId:
                    gouvernorat.id,
                },
            },

            create: {
              numero:
                numeroTitreFinal,

              gouvernorat: {
                connect: {
                  id:
                    gouvernorat.id,
                },
              },
            },
          },
        };
      }


      /**
       * ------------------------------------------------------
       * RECALCUL DE LA PRESTATION
       * ------------------------------------------------------
       */
      if (recalculerTarification) {
        const tarification =
          await TarificationService
            .calculer({
              nature:
                "PRESTATION",

              prestationId:
                prestation.id,

              nombrePages:
                nombrePagesFinal,

              langue:
                langueFinale,
            });


        const montantTotal =
          new Prisma.Decimal(
            tarification
              .montantTotal
          );


        /**
         * Compatibilité avec le paiement
         * existant.
         */
        updateData.montantTotal =
          montantTotal;

        updateData.prixUnitaire =
          montantTotal;

        updateData.nombreExemplaires =
          1;


        /**
         * Snapshot tarifaire.
         */
        updateData.tarification = {
          upsert: {
            create: {
              nature:
                NatureDemande
                  .PRESTATION,

              prestationCode:
                tarification
                  .prestation
                  ?.code ??
                null,

              prestationLibelle:
                tarification
                  .prestation
                  ?.libelle ??
                null,

              langue:
                langueFinale,

              nombrePages:
                nombrePagesFinal ??
                null,

              montantTotal,

              referenceReglementaire:
                tarification
                  .referenceReglementaire,

              statut:
                StatutTarification
                  .CALCULEE,

              dateCalcul:
                new Date(),

              dateFigeage:
                null,

              lignes: {
                create:
                  tarification
                    .lignes
                    .map(
                      (
                        ligne,
                        index
                      ) => ({
                        type:
                          ligne.type,

                        code:
                          ligne.code,

                        libelle:
                          ligne.libelle,

                        quantite:
                          ligne.quantite,

                        montantUnitaire:
                          new Prisma.Decimal(
                            ligne
                              .montantUnitaire
                          ),

                        montant:
                          new Prisma.Decimal(
                            ligne.montant
                          ),

                        ordre:
                          index + 1,
                      })
                    ),
              },
            },

            update: {
              nature:
                NatureDemande
                  .PRESTATION,

              prestationCode:
                tarification
                  .prestation
                  ?.code ??
                null,

              prestationLibelle:
                tarification
                  .prestation
                  ?.libelle ??
                null,

              langue:
                langueFinale,

              nombrePages:
                nombrePagesFinal ??
                null,

              montantTotal,

              referenceReglementaire:
                tarification
                  .referenceReglementaire,

              statut:
                StatutTarification
                  .CALCULEE,

              dateCalcul:
                new Date(),

              dateFigeage:
                null,

              lignes: {
                deleteMany: {},

                create:
                  tarification
                    .lignes
                    .map(
                      (
                        ligne,
                        index
                      ) => ({
                        type:
                          ligne.type,

                        code:
                          ligne.code,

                        libelle:
                          ligne.libelle,

                        quantite:
                          ligne.quantite,

                        montantUnitaire:
                          new Prisma.Decimal(
                            ligne
                              .montantUnitaire
                          ),

                        montant:
                          new Prisma.Decimal(
                            ligne.montant
                          ),

                        ordre:
                          index + 1,
                      })
                    ),
              },
            },
          },
        };
      }


      return this.demandeRepository
        .update(
          id,
          updateData
        );
    }


    /**
     * Cas théoriquement impossible,
     * mais conservé comme sécurité.
     */
    throw new AppError(
      "Nature de demande non prise en charge.",
      400
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

    /*
     * Nouveau workflow du guichet :
     * - le Responsable Guichet valide les dossiers ;
     * - il ne rejette plus les demandes ;
     * - l'Administrateur conserve pour le moment son
     *   droit exceptionnel de rejet.
     */
    if (
      nouveauStatut ===
        StatutDemande.VALIDEE &&
      !isAdmin &&
      !isResponsable
    ) {
      throw new AppError(
        "Seul un responsable peut valider une demande.",
        403
      );
    }

    if (
      nouveauStatut ===
        StatutDemande.REJETEE &&
      !isAdmin
    ) {
      throw new AppError(
        isResponsable
          ? "Le Responsable Guichet ne peut pas rejeter une demande. Il doit contrôler puis valider le dossier avant la clôture du guichet."
          : "Seul un administrateur peut rejeter une demande.",
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
     * Le paiement initial doit être confirmé avant :
     * - la transmission au Responsable ;
     * - la validation au niveau du guichet ;
     * - un éventuel rejet administratif exceptionnel.
     *
     * Important : un complément créé après une correction
     * du Responsable peut rester à payer. Il constitue une
     * dette et ne bloque pas la validation du dossier ni la
     * poursuite vers le service Étude. Son règlement sera
     * exigé avant la délivrance finale du certificat.
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