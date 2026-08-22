import {
  DecisionAvisEtude,
  ModePreparationMinute,
  NatureDemande,
  NiveauAvisEtude,
  Prisma,
  StatutDemande,
  StatutDossierEtude,
  StatutEtudeOperation,
  StatutJournalCloture,
  TypeAffectationEtude,
} from "@prisma/client";

import prisma from "../config/prisma";

interface FindDemandesADistribuerParams {
  page: number;
  limit: number;
  search?: string;
  dateCloture?: Date;
  maxDateClotureExclusive: Date;
}

interface CreateDistributionParams {
  demandeId: string;
  distribueParId: string;
  redacteurId: string;
  verificateurId: string;
  superVerificateurId: string;
  operationIds: string[];
}

interface FindDossiersRedacteurParams {
  utilisateurId: string;
  page: number;
  limit: number;
  search?: string;
}


interface EnregistrerAvisRedacteurParams {
  etudeOperationId: string;
  auteurId: string;
  decision: DecisionAvisEtude;
  observations?: string;
  motifsRefus?: string[];
  minute?: {
    modePreparation:
      ModePreparationMinute;
    referenceModele?: string;
    contenu: string;
  };
}

export class ServiceEtudeRepository {
  private buildSearchFilter(
    search?: string
  ): Prisma.DemandeWhereInput {
    const normalizedSearch =
      search?.trim();

    if (!normalizedSearch) {
      return {};
    }

    return {
      OR: [
        {
          numero: {
            contains:
              normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          nomDemandeur: {
            contains:
              normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          prenomDemandeur: {
            contains:
              normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          cin: {
            contains:
              normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          titreFoncier: {
            is: {
              numero: {
                contains:
                  normalizedSearch,
                mode: "insensitive",
              },
            },
          },
        },

        {
          titreFoncier: {
            is: {
              gouvernorat: {
                nom: {
                  contains:
                    normalizedSearch,
                  mode:
                    "insensitive",
                },
              },
            },
          },
        },

        {
          journalCloture: {
            is: {
              numero: {
                contains:
                  normalizedSearch,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    };
  }

  private buildEligibleWhere({
    search,
    dateCloture,
    maxDateClotureExclusive,
  }: Omit<
    FindDemandesADistribuerParams,
    "page" | "limit"
  >): Prisma.DemandeWhereInput {
    const journalDateFilter:
      Prisma.DateTimeFilter = {
        lt:
          maxDateClotureExclusive,
      };

    if (dateCloture) {
      journalDateFilter.equals =
        dateCloture;
    }

    return {
      AND: [
        {
          nature:
            NatureDemande.INSCRIPTION,
        },

        {
          statut:
            StatutDemande.VALIDEE,
        },

        /*
         * Une demande déjà distribuée possède
         * déjà un DossierEtude et doit disparaître
         * de cette file.
         */
        {
          dossierEtude: {
            is: null,
          },
        },

        /*
         * Le service d'étude travaille opération
         * par opération. Une inscription sans
         * opération ne peut donc pas être distribuée.
         */
        {
          operationsFoncieres: {
            some: {},
          },
        },

        /*
         * La demande doit appartenir à une journée
         * du guichet actuellement CLOTUREE.
         *
         * La date doit également être antérieure
         * à la journée administrative courante :
         * la distribution intervient au plus tôt
         * le lendemain de la clôture du guichet.
         */
        {
          journalCloture: {
            is: {
              statut:
                StatutJournalCloture.CLOTURE,

              dateJour:
                journalDateFilter,
            },
          },
        },

        this.buildSearchFilter(
          search
        ),
      ],
    };
  }

  async findDemandesADistribuer(
    params:
      FindDemandesADistribuerParams
  ) {
    const {
      page,
      limit,
    } = params;

    const skip =
      (page - 1) * limit;

    const where =
      this.buildEligibleWhere({
        search:
          params.search,

        dateCloture:
          params.dateCloture,

        maxDateClotureExclusive:
          params
            .maxDateClotureExclusive,
      });

    const [
      data,
      total,
    ] = await Promise.all([
      prisma.demande.findMany({
        where,

        skip,
        take: limit,

        orderBy: [
          {
            journalCloture: {
              dateJour: "asc",
            },
          },
          {
            numero: "asc",
          },
        ],

        select: {
          id: true,
          numero: true,

          nomDemandeur: true,
          prenomDemandeur: true,
          cin: true,

          nature: true,
          statut: true,

          titreFoncier: {
            select: {
              id: true,
              numero: true,

              gouvernorat: {
                select: {
                  id: true,
                  code: true,
                  nom: true,
                },
              },
            },
          },

          journalCloture: {
            select: {
              id: true,
              numero: true,
              dateJour: true,
              dateCloture: true,
              statut: true,
            },
          },

          operationsFoncieres: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              createdAt: true,

              typeOperationFonciere: {
                select: {
                  id: true,
                  code: true,
                  libelle: true,
                  categorie: true,
                },
              },
            },
          },

          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              operationsFoncieres:
                true,
            },
          },
        },
      }),

      prisma.demande.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,

      totalPages:
        Math.ceil(
          total / limit
        ),
    };
  }

  /*
   * Charge les informations nécessaires pour
   * vérifier qu'une demande est encore distribuable
   * au moment du POST.
   */
  async findDemandePourDistribution(
    demandeId: string
  ) {
    return prisma.demande.findUnique({
      where: {
        id: demandeId,
      },

      select: {
        id: true,
        numero: true,
        nature: true,
        statut: true,

        dossierEtude: {
          select: {
            id: true,
          },
        },

        journalCloture: {
          select: {
            id: true,
            numero: true,
            dateJour: true,
            dateCloture: true,
            statut: true,
          },
        },

        operationsFoncieres: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,

            typeOperationFonciere: {
              select: {
                code: true,
                libelle: true,
              },
            },
          },
        },
      },
    });
  }

  /*
   * Création atomique de la distribution :
   * - 1 DossierEtude ;
   * - 3 AffectationEtude ;
   * - 1 EtudeOperation par opération foncière.
   */
  async createDistribution(
    params:
      CreateDistributionParams
  ) {
    return prisma.dossierEtude.create({
      data: {
        demande: {
          connect: {
            id:
              params.demandeId,
          },
        },

        distribuePar: {
          connect: {
            id:
              params.distribueParId,
          },
        },

        affectations: {
          create: [
            {
              type:
                TypeAffectationEtude.REDACTEUR,

              utilisateur: {
                connect: {
                  id:
                    params.redacteurId,
                },
              },

              attribuePar: {
                connect: {
                  id:
                    params.distribueParId,
                },
              },
            },

            {
              type:
                TypeAffectationEtude.VERIFICATEUR,

              utilisateur: {
                connect: {
                  id:
                    params.verificateurId,
                },
              },

              attribuePar: {
                connect: {
                  id:
                    params.distribueParId,
                },
              },
            },

            {
              type:
                TypeAffectationEtude.SUPER_VERIFICATEUR,

              utilisateur: {
                connect: {
                  id:
                    params.superVerificateurId,
                },
              },

              attribuePar: {
                connect: {
                  id:
                    params.distribueParId,
                },
              },
            },
          ],
        },

        etudesOperations: {
          create:
            params.operationIds.map(
              (
                operationId
              ) => ({
                demandeOperationFonciere: {
                  connect: {
                    id:
                      operationId,
                  },
                },
              })
            ),
        },
      },

      select: {
        id: true,
        statut: true,
        dateDistribution: true,
        createdAt: true,

        demande: {
          select: {
            id: true,
            numero: true,
            nomDemandeur: true,
            prenomDemandeur: true,

            titreFoncier: {
              select: {
                numero: true,

                gouvernorat: {
                  select: {
                    code: true,
                    nom: true,
                  },
                },
              },
            },

            journalCloture: {
              select: {
                id: true,
                numero: true,
                dateJour: true,
              },
            },
          },
        },

        distribuePar: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            login: true,

            role: {
              select: {
                nom: true,
              },
            },
          },
        },

        affectations: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            type: true,
            dateDebut: true,
            dateFin: true,

            utilisateur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                login: true,

                role: {
                  select: {
                    nom: true,
                  },
                },
              },
            },
          },
        },

        etudesOperations: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            statut: true,
            createdAt: true,

            demandeOperationFonciere: {
              select: {
                id: true,

                typeOperationFonciere: {
                  select: {
                    id: true,
                    code: true,
                    libelle: true,
                    categorie: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }


  /*
   * File personnelle du Rédacteur.
   *
   * Un dossier n'est visible que si le Rédacteur
   * connecté possède une affectation REDACTEUR
   * encore active sur ce dossier.
   */
  async findDossiersRedacteur(
    params:
      FindDossiersRedacteurParams
  ) {
    const skip =
      (params.page - 1) *
      params.limit;

    const normalizedSearch =
      params.search?.trim();

    const where:
      Prisma.DossierEtudeWhereInput = {
      statut:
        StatutDossierEtude.EN_ETUDE,

      affectations: {
        some: {
          type:
            TypeAffectationEtude.REDACTEUR,

          utilisateurId:
            params.utilisateurId,

          dateFin: null,
        },
      },

      ...(normalizedSearch
        ? {
            demande: {
              is: {
                OR: [
                  {
                    numero: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    nomDemandeur: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    prenomDemandeur: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    cin: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    titreFoncier: {
                      is: {
                        numero: {
                          contains:
                            normalizedSearch,
                          mode:
                            "insensitive",
                        },
                      },
                    },
                  },

                  {
                    titreFoncier: {
                      is: {
                        gouvernorat: {
                          nom: {
                            contains:
                              normalizedSearch,
                            mode:
                              "insensitive",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          }
        : {}),
    };

    const [
      data,
      total,
    ] = await Promise.all([
      prisma.dossierEtude.findMany({
        where,

        skip,
        take:
          params.limit,

        orderBy: {
          dateDistribution:
            "desc",
        },

        select: {
          id: true,
          statut: true,
          dateDistribution: true,
          createdAt: true,
          updatedAt: true,

          demande: {
            select: {
              id: true,
              numero: true,
              nomDemandeur: true,
              prenomDemandeur: true,
              cin: true,
              nature: true,
              statut: true,

              titreFoncier: {
                select: {
                  id: true,
                  numero: true,

                  gouvernorat: {
                    select: {
                      id: true,
                      code: true,
                      nom: true,
                    },
                  },
                },
              },

              journalCloture: {
                select: {
                  id: true,
                  numero: true,
                  dateJour: true,
                },
              },
            },
          },

          affectations: {
            where: {
              dateFin: null,
            },

            orderBy: {
              dateDebut: "asc",
            },

            select: {
              id: true,
              type: true,
              dateDebut: true,

              utilisateur: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  login: true,

                  role: {
                    select: {
                      nom: true,
                    },
                  },
                },
              },
            },
          },

          etudesOperations: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              statut: true,
              createdAt: true,
              updatedAt: true,

              demandeOperationFonciere: {
                select: {
                  id: true,

                  typeOperationFonciere: {
                    select: {
                      id: true,
                      code: true,
                      libelle: true,
                      categorie: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      prisma.dossierEtude.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page:
        params.page,
      limit:
        params.limit,

      totalPages:
        Math.ceil(
          total /
            params.limit
        ),
    };
  }


  async findDossierRedacteurById(
    dossierId: string,
    utilisateurId: string
  ) {
    return prisma.dossierEtude.findFirst({
      where: {
        id: dossierId,
        statut:
          StatutDossierEtude.EN_ETUDE,
        affectations: {
          some: {
            type:
              TypeAffectationEtude.REDACTEUR,
            utilisateurId,
            dateFin: null,
          },
        },
      },

      select: {
        id: true,
        statut: true,
        dateDistribution: true,
        createdAt: true,
        updatedAt: true,

        demande: {
          select: {
            id: true,
            numero: true,
            nomDemandeur: true,
            prenomDemandeur: true,
            cin: true,
            telephone: true,
            email: true,
            dateNaissanceDemandeur: true,
            adresseDemandeur: true,
            statutVerificationCni: true,
            dateVerificationCni: true,
            sourceVerificationCni: true,
            referenceVerificationCni: true,
            messageVerificationCni: true,
            referenceFonciere: true,
            adresseBien: true,
            observations: true,
            nature: true,
            statut: true,

            titreFoncier: {
              select: {
                id: true,
                numero: true,
                gouvernorat: {
                  select: {
                    id: true,
                    code: true,
                    nom: true,
                  },
                },
              },
            },

            journalCloture: {
              select: {
                id: true,
                numero: true,
                dateJour: true,
                dateCloture: true,
                statut: true,
              },
            },

            documentsTeleverses: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                type: true,
                nomOriginal: true,
                mimeType: true,
                taille: true,
                statut: true,
                motifNonConformite: true,
                createdAt: true,
                updatedAt: true,
              },
            },

            createdAt: true,
            updatedAt: true,
          },
        },

        distribuePar: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            login: true,
            role: {
              select: {
                nom: true,
              },
            },
          },
        },

        affectations: {
          where: {
            dateFin: null,
          },
          orderBy: {
            dateDebut: "asc",
          },
          select: {
            id: true,
            type: true,
            dateDebut: true,
            dateFin: true,
            utilisateur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                login: true,
                role: {
                  select: {
                    nom: true,
                  },
                },
              },
            },
          },
        },

        etudesOperations: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            statut: true,
            createdAt: true,
            updatedAt: true,
            demandeOperationFonciere: {
              select: {
                id: true,
                createdAt: true,
                typeOperationFonciere: {
                  select: {
                    id: true,
                    code: true,
                    libelle: true,
                    description: true,
                    categorie: true,
                  },
                },
              },
            },

            avis: {
              orderBy: [
                {
                  niveau: "asc",
                },
                {
                  numeroAvis: "asc",
                },
              ],

              select: {
                id: true,
                niveau: true,
                decision: true,
                numeroAvis: true,
                observations: true,
                createdAt: true,
                updatedAt: true,

                auteur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },

                motifsRefus: {
                  orderBy: {
                    ordre: "asc",
                  },

                  select: {
                    id: true,
                    texte: true,
                    ordre: true,
                    createdAt: true,
                  },
                },
              },
            },

            minuteInscription: {
              select: {
                id: true,
                modePreparation: true,
                referenceModele: true,
                versionFinaleId: true,
                createdAt: true,
                updatedAt: true,

                versions: {
                  orderBy: {
                    numeroVersion:
                      "asc",
                  },

                  select: {
                    id: true,
                    numeroVersion: true,
                    contenu: true,
                    niveauAuteur: true,
                    createdAt: true,

                    auteur: {
                      select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        login: true,
                      },
                    },
                  },
                },
              },
            },

            retoursCorrection: {
              orderBy: {
                dateRetour: "asc",
              },

              select: {
                id: true,
                deNiveau: true,
                versNiveau: true,
                motif: true,
                dateRetour: true,
                dateTraitement: true,
                createdAt: true,

                auteur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },

                destinataire: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }


  /*
   * Vérifie que l'opération appartient bien à un dossier
   * sur lequel le Rédacteur connecté possède encore
   * l'affectation active.
   */
  async findEtudeOperationRedacteurById(
    etudeOperationId: string,
    utilisateurId: string
  ) {
    return prisma.etudeOperation.findFirst({
      where: {
        id:
          etudeOperationId,

        dossierEtude: {
          is: {
            statut:
              StatutDossierEtude.EN_ETUDE,

            affectations: {
              some: {
                type:
                  TypeAffectationEtude.REDACTEUR,

                utilisateurId,

                dateFin: null,
              },
            },
          },
        },
      },

      select: {
        id: true,
        statut: true,
        dossierEtudeId: true,
        avisFinalId: true,

        demandeOperationFonciere: {
          select: {
            id: true,

            typeOperationFonciere: {
              select: {
                id: true,
                code: true,
                libelle: true,
                categorie: true,
              },
            },
          },
        },

        avis: {
          where: {
            niveau:
              NiveauAvisEtude.REDACTEUR,
          },

          orderBy: {
            numeroAvis: "desc",
          },

          take: 1,

          select: {
            id: true,
            niveau: true,
            decision: true,
            numeroAvis: true,
            observations: true,
            createdAt: true,

            motifsRefus: {
              orderBy: {
                ordre: "asc",
              },

              select: {
                id: true,
                texte: true,
                ordre: true,
              },
            },
          },
        },

        minuteInscription: {
          select: {
            id: true,
            modePreparation: true,
            referenceModele: true,

            versions: {
              orderBy: {
                numeroVersion:
                  "desc",
              },

              take: 1,

              select: {
                id: true,
                numeroVersion: true,
                createdAt: true,
              },
            },
          },
        },

        dossierEtude: {
          select: {
            id: true,

            affectations: {
              where: {
                dateFin: null,
              },

              select: {
                id: true,
                type: true,

                utilisateur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                    statut: true,

                    role: {
                      select: {
                        nom: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /*
   * Sauvegarde un nouvel instantané de l'avis du Rédacteur.
   *
   * Chaque sauvegarde crée un nouvel AvisEtude afin de
   * conserver l'historique.
   *
   * Pour INSCRIPTION :
   * - création de la minute logique à la première sauvegarde ;
   * - création d'une nouvelle VersionMinute à chaque sauvegarde.
   *
   * Pour REFUS :
   * - les motifs sont rattachés au nouvel avis.
   *
   * Le statut de EtudeOperation n'est PAS modifié ici :
   * la transmission au Vérificateur fera l'objet d'une action
   * métier séparée.
   */
  async enregistrerAvisRedacteur(
    params:
      EnregistrerAvisRedacteurParams
  ) {
    return prisma.$transaction(
      async (tx) => {
        const dernierAvis =
          await tx.avisEtude.findFirst({
            where: {
              etudeOperationId:
                params.etudeOperationId,

              niveau:
                NiveauAvisEtude.REDACTEUR,
            },

            orderBy: {
              numeroAvis:
                "desc",
            },

            select: {
              numeroAvis: true,
            },
          });

        const numeroAvis =
          (dernierAvis?.numeroAvis ??
            0) + 1;

        const avis =
          await tx.avisEtude.create({
            data: {
              etudeOperationId:
                params.etudeOperationId,

              niveau:
                NiveauAvisEtude.REDACTEUR,

              decision:
                params.decision,

              numeroAvis,

              auteurId:
                params.auteurId,

              observations:
                params.observations,

              ...(params.decision ===
                DecisionAvisEtude.REFUS
                ? {
                    motifsRefus: {
                      create:
                        (
                          params
                            .motifsRefus ??
                          []
                        ).map(
                          (
                            texte,
                            index
                          ) => ({
                            texte,
                            ordre:
                              index + 1,
                          })
                        ),
                    },
                  }
                : {}),
            },

            select: {
              id: true,
              niveau: true,
              decision: true,
              numeroAvis: true,
              observations: true,
              createdAt: true,

              auteur: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  login: true,
                },
              },

              motifsRefus: {
                orderBy: {
                  ordre: "asc",
                },

                select: {
                  id: true,
                  texte: true,
                  ordre: true,
                  createdAt: true,
                },
              },
            },
          });

        let minuteInscription =
          null;

        if (
          params.decision ===
            DecisionAvisEtude.INSCRIPTION &&
          params.minute
        ) {
          let minute =
            await tx
              .minuteInscription
              .findUnique({
                where: {
                  etudeOperationId:
                    params
                      .etudeOperationId,
                },

                select: {
                  id: true,
                  modePreparation:
                    true,
                  referenceModele:
                    true,
                },
              });

          if (!minute) {
            minute =
              await tx
                .minuteInscription
                .create({
                  data: {
                    etudeOperationId:
                      params
                        .etudeOperationId,

                    modePreparation:
                      params.minute
                        .modePreparation,

                    referenceModele:
                      params.minute
                        .referenceModele,
                  },

                  select: {
                    id: true,
                    modePreparation:
                      true,
                    referenceModele:
                      true,
                  },
                });
          }

          const derniereVersion =
            await tx.versionMinute
              .findFirst({
                where: {
                  minuteInscriptionId:
                    minute.id,
                },

                orderBy: {
                  numeroVersion:
                    "desc",
                },

                select: {
                  numeroVersion: true,
                },
              });

          const numeroVersion =
            (
              derniereVersion
                ?.numeroVersion ??
              0
            ) + 1;

          const version =
            await tx.versionMinute
              .create({
                data: {
                  minuteInscriptionId:
                    minute.id,

                  numeroVersion,

                  contenu:
                    params.minute
                      .contenu,

                  auteurId:
                    params.auteurId,

                  niveauAuteur:
                    NiveauAvisEtude.REDACTEUR,
                },

                select: {
                  id: true,
                  numeroVersion: true,
                  contenu: true,
                  niveauAuteur: true,
                  createdAt: true,

                  auteur: {
                    select: {
                      id: true,
                      nom: true,
                      prenom: true,
                      login: true,
                    },
                  },
                },
              });

          minuteInscription = {
            ...minute,
            versionCreee:
              version,
          };
        }

        return {
          avis,
          minuteInscription,
        };
      }
    );
  }


  /*
   * Transmission atomique d'une opération du Rédacteur
   * vers le Vérificateur.
   *
   * Le contenu métier déjà sauvegardé n'est ni modifié
   * ni supprimé. Seul le statut de l'EtudeOperation passe
   * à EN_VERIFICATION.
   *
   * En cas de retransmission après correction, les retours
   * ouverts à destination du Rédacteur sont marqués comme
   * traités.
   */
  async transmettreOperationRedacteur(
    etudeOperationId: string,
    utilisateurId: string,
    statutActuel:
      StatutEtudeOperation
  ) {
    return prisma.$transaction(
      async (tx) => {
        const updateResult =
          await tx.etudeOperation
            .updateMany({
              where: {
                id:
                  etudeOperationId,

                statut:
                  statutActuel,

                avisFinalId: null,

                dossierEtude: {
                  is: {
                    statut:
                      StatutDossierEtude.EN_ETUDE,

                    affectations: {
                      some: {
                        type:
                          TypeAffectationEtude.REDACTEUR,

                        utilisateurId,

                        dateFin: null,
                      },
                    },
                  },
                },
              },

              data: {
                statut:
                  StatutEtudeOperation.EN_VERIFICATION,
              },
            });

        if (
          updateResult.count !== 1
        ) {
          return null;
        }

        if (
          statutActuel ===
          StatutEtudeOperation.A_CORRIGER_REDACTEUR
        ) {
          await tx.retourCorrection
            .updateMany({
              where: {
                etudeOperationId,

                versNiveau:
                  NiveauAvisEtude.REDACTEUR,

                dateTraitement:
                  null,
              },

              data: {
                dateTraitement:
                  new Date(),
              },
            });
        }

        return tx.etudeOperation
          .findUnique({
            where: {
              id:
                etudeOperationId,
            },

            select: {
              id: true,
              statut: true,
              updatedAt: true,

              demandeOperationFonciere: {
                select: {
                  id: true,

                  typeOperationFonciere: {
                    select: {
                      id: true,
                      code: true,
                      libelle: true,
                      categorie: true,
                    },
                  },
                },
              },

              avis: {
                where: {
                  niveau:
                    NiveauAvisEtude.REDACTEUR,
                },

                orderBy: {
                  numeroAvis:
                    "desc",
                },

                take: 1,

                select: {
                  id: true,
                  niveau: true,
                  decision: true,
                  numeroAvis: true,
                  observations: true,
                  createdAt: true,

                  motifsRefus: {
                    orderBy: {
                      ordre: "asc",
                    },

                    select: {
                      id: true,
                      texte: true,
                      ordre: true,
                    },
                  },
                },
              },

              minuteInscription: {
                select: {
                  id: true,
                  modePreparation: true,
                  referenceModele: true,
                  versionFinaleId: true,

                  versions: {
                    orderBy: {
                      numeroVersion:
                        "desc",
                    },

                    take: 1,

                    select: {
                      id: true,
                      numeroVersion: true,
                      contenu: true,
                      niveauAuteur: true,
                      createdAt: true,
                    },
                  },
                },
              },

              dossierEtude: {
                select: {
                  affectations: {
                    where: {
                      type:
                        TypeAffectationEtude.VERIFICATEUR,

                      dateFin:
                        null,
                    },

                    take: 1,

                    select: {
                      id: true,
                      type: true,
                      dateDebut: true,

                      utilisateur: {
                        select: {
                          id: true,
                          nom: true,
                          prenom: true,
                          login: true,

                          role: {
                            select: {
                              nom: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          });
      }
    );
  }


  /*
   * File personnelle du Vérificateur.
   *
   * Un dossier est visible uniquement si le Vérificateur
   * connecté possède l'affectation VERIFICATEUR active.
   *
   * Toutes les opérations du dossier restent visibles pour
   * le suivi, mais seules EN_VERIFICATION et
   * A_CORRIGER_VERIFICATEUR sont actuellement à traiter par
   * le Vérificateur.
   */
  async findDossiersVerificateur(
    utilisateurId: string,
    page: number,
    limit: number,
    search?: string
  ) {
    const skip =
      (page - 1) * limit;

    const normalizedSearch =
      search?.trim();

    const where:
      Prisma.DossierEtudeWhereInput = {
      statut:
        StatutDossierEtude.EN_ETUDE,

      affectations: {
        some: {
          type:
            TypeAffectationEtude.VERIFICATEUR,

          utilisateurId,

          dateFin: null,
        },
      },

      ...(normalizedSearch
        ? {
            demande: {
              is: {
                OR: [
                  {
                    numero: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    nomDemandeur: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    prenomDemandeur: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    cin: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    titreFoncier: {
                      is: {
                        numero: {
                          contains:
                            normalizedSearch,
                          mode:
                            "insensitive",
                        },
                      },
                    },
                  },

                  {
                    titreFoncier: {
                      is: {
                        gouvernorat: {
                          nom: {
                            contains:
                              normalizedSearch,
                            mode:
                              "insensitive",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          }
        : {}),
    };

    const [
      data,
      total,
    ] = await Promise.all([
      prisma.dossierEtude.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          dateDistribution:
            "desc",
        },

        select: {
          id: true,
          statut: true,
          dateDistribution: true,
          createdAt: true,
          updatedAt: true,

          demande: {
            select: {
              id: true,
              numero: true,
              nomDemandeur: true,
              prenomDemandeur: true,
              cin: true,
              nature: true,
              statut: true,

              titreFoncier: {
                select: {
                  id: true,
                  numero: true,

                  gouvernorat: {
                    select: {
                      id: true,
                      code: true,
                      nom: true,
                    },
                  },
                },
              },

              journalCloture: {
                select: {
                  id: true,
                  numero: true,
                  dateJour: true,
                },
              },
            },
          },

          affectations: {
            where: {
              dateFin: null,
            },

            orderBy: {
              dateDebut: "asc",
            },

            select: {
              id: true,
              type: true,
              dateDebut: true,

              utilisateur: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  login: true,

                  role: {
                    select: {
                      nom: true,
                    },
                  },
                },
              },
            },
          },

          etudesOperations: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              statut: true,
              createdAt: true,
              updatedAt: true,

              demandeOperationFonciere: {
                select: {
                  id: true,

                  typeOperationFonciere: {
                    select: {
                      id: true,
                      code: true,
                      libelle: true,
                      categorie: true,
                    },
                  },
                },
              },

              /*
               * Dans la file du Vérificateur, on expose le
               * dernier avis du Rédacteur afin d'identifier
               * immédiatement le travail qui lui est transmis.
               */
              avis: {
                where: {
                  niveau:
                    NiveauAvisEtude.REDACTEUR,
                },

                orderBy: {
                  numeroAvis:
                    "desc",
                },

                take: 1,

                select: {
                  id: true,
                  niveau: true,
                  decision: true,
                  numeroAvis: true,
                  observations: true,
                  createdAt: true,

                  motifsRefus: {
                    orderBy: {
                      ordre:
                        "asc",
                    },

                    select: {
                      id: true,
                      texte: true,
                      ordre: true,
                    },
                  },
                },
              },

              minuteInscription: {
                select: {
                  id: true,
                  modePreparation: true,
                  referenceModele: true,

                  versions: {
                    orderBy: {
                      numeroVersion:
                        "desc",
                    },

                    take: 1,

                    select: {
                      id: true,
                      numeroVersion: true,
                      contenu: true,
                      niveauAuteur: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      prisma.dossierEtude.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,

      totalPages:
        Math.ceil(
          total / limit
        ),
    };
  }


  /*
   * Détail d'un dossier accessible uniquement au
   * Vérificateur qui possède l'affectation active.
   *
   * Le détail expose le dossier complet nécessaire à
   * l'étude : données du demandeur, titre, documents,
   * équipe active, avis historisés, minute/versionnement
   * et retours pour correction.
   *
   * Aucun chemin physique de document n'est exposé.
   */
  async findDossierVerificateurById(
    dossierId: string,
    utilisateurId: string
  ) {
    return prisma.dossierEtude.findFirst({
      where: {
        id:
          dossierId,

        statut:
          StatutDossierEtude.EN_ETUDE,

        affectations: {
          some: {
            type:
              TypeAffectationEtude.VERIFICATEUR,

            utilisateurId,

            dateFin: null,
          },
        },
      },

      select: {
        id: true,
        statut: true,
        dateDistribution: true,
        createdAt: true,
        updatedAt: true,

        demande: {
          select: {
            id: true,
            numero: true,

            nomDemandeur: true,
            prenomDemandeur: true,
            cin: true,
            telephone: true,
            email: true,

            dateNaissanceDemandeur:
              true,
            adresseDemandeur:
              true,

            statutVerificationCni:
              true,
            dateVerificationCni:
              true,
            sourceVerificationCni:
              true,
            referenceVerificationCni:
              true,
            messageVerificationCni:
              true,

            referenceFonciere:
              true,
            adresseBien:
              true,
            observations:
              true,

            nature: true,
            statut: true,

            titreFoncier: {
              select: {
                id: true,
                numero: true,

                gouvernorat: {
                  select: {
                    id: true,
                    code: true,
                    nom: true,
                  },
                },
              },
            },

            journalCloture: {
              select: {
                id: true,
                numero: true,
                dateJour: true,
                dateCloture: true,
                statut: true,
              },
            },

            documentsTeleverses: {
              orderBy: {
                createdAt: "asc",
              },

              select: {
                id: true,
                type: true,
                nomOriginal: true,
                mimeType: true,
                taille: true,
                statut: true,
                motifNonConformite:
                  true,
                createdAt: true,
                updatedAt: true,
              },
            },

            createdAt: true,
            updatedAt: true,
          },
        },

        distribuePar: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            login: true,

            role: {
              select: {
                nom: true,
              },
            },
          },
        },

        affectations: {
          where: {
            dateFin: null,
          },

          orderBy: {
            dateDebut: "asc",
          },

          select: {
            id: true,
            type: true,
            dateDebut: true,
            dateFin: true,

            utilisateur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                login: true,

                role: {
                  select: {
                    nom: true,
                  },
                },
              },
            },
          },
        },

        etudesOperations: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            statut: true,
            avisFinalId: true,
            createdAt: true,
            updatedAt: true,

            demandeOperationFonciere: {
              select: {
                id: true,
                createdAt: true,

                typeOperationFonciere: {
                  select: {
                    id: true,
                    code: true,
                    libelle: true,
                    description: true,
                    categorie: true,
                  },
                },
              },
            },

            avis: {
              orderBy: [
                {
                  niveau: "asc",
                },
                {
                  numeroAvis: "asc",
                },
              ],

              select: {
                id: true,
                niveau: true,
                decision: true,
                numeroAvis: true,
                observations: true,
                createdAt: true,
                updatedAt: true,

                auteur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },

                motifsRefus: {
                  orderBy: {
                    ordre: "asc",
                  },

                  select: {
                    id: true,
                    texte: true,
                    ordre: true,
                    createdAt: true,
                  },
                },
              },
            },

            minuteInscription: {
              select: {
                id: true,
                modePreparation: true,
                referenceModele: true,
                versionFinaleId: true,
                createdAt: true,
                updatedAt: true,

                versions: {
                  orderBy: {
                    numeroVersion:
                      "asc",
                  },

                  select: {
                    id: true,
                    numeroVersion: true,
                    contenu: true,
                    niveauAuteur: true,
                    createdAt: true,

                    auteur: {
                      select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        login: true,
                      },
                    },
                  },
                },
              },
            },

            retoursCorrection: {
              orderBy: {
                dateRetour: "asc",
              },

              select: {
                id: true,
                deNiveau: true,
                versNiveau: true,
                motif: true,
                dateRetour: true,
                dateTraitement: true,
                createdAt: true,

                auteur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },

                destinataire: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }


  /*
   * Vérifie qu'une opération appartient bien à un dossier
   * sur lequel le Vérificateur connecté possède encore
   * l'affectation active.
   *
   * Le dernier avis du Rédacteur est chargé afin de
   * comparer les deux décisions.
   */
  async findEtudeOperationVerificateurById(
    etudeOperationId: string,
    utilisateurId: string
  ) {
    return prisma.etudeOperation.findFirst({
      where: {
        id:
          etudeOperationId,

        dossierEtude: {
          is: {
            statut:
              StatutDossierEtude.EN_ETUDE,

            affectations: {
              some: {
                type:
                  TypeAffectationEtude.VERIFICATEUR,

                utilisateurId,

                dateFin: null,
              },
            },
          },
        },
      },

      select: {
        id: true,
        statut: true,
        avisFinalId: true,

        demandeOperationFonciere: {
          select: {
            id: true,

            typeOperationFonciere: {
              select: {
                id: true,
                code: true,
                libelle: true,
                categorie: true,
              },
            },
          },
        },

        avis: {
          where: {
            niveau:
              NiveauAvisEtude.REDACTEUR,
          },

          orderBy: {
            numeroAvis: "desc",
          },

          take: 1,

          select: {
            id: true,
            niveau: true,
            decision: true,
            numeroAvis: true,
            observations: true,
            createdAt: true,

            motifsRefus: {
              orderBy: {
                ordre: "asc",
              },

              select: {
                id: true,
                texte: true,
                ordre: true,
              },
            },
          },
        },

        minuteInscription: {
          select: {
            id: true,
            modePreparation: true,
            referenceModele: true,

            versions: {
              orderBy: {
                numeroVersion: "desc",
              },

              take: 1,

              select: {
                id: true,
                numeroVersion: true,
                contenu: true,
                niveauAuteur: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  /*
   * Sauvegarde un nouvel avis du Vérificateur.
   *
   * Chaque sauvegarde crée un nouvel AvisEtude afin de
   * conserver l'historique complet.
   *
   * Le Vérificateur ne modifie jamais directement la minute
   * du Rédacteur : aucune VersionMinute n'est créée ici.
   *
   * Le statut de l'opération n'est pas modifié. Le choix
   * suivant (transmettre au Super-vérificateur ou retourner
   * au Rédacteur) fera l'objet d'une action métier distincte.
   */
  async enregistrerAvisVerificateur(
    etudeOperationId: string,
    auteurId: string,
    decision:
      DecisionAvisEtude,
    observations?: string,
    motifsRefus?: string[]
  ) {
    return prisma.$transaction(
      async (tx) => {
        const dernierAvis =
          await tx.avisEtude.findFirst({
            where: {
              etudeOperationId,

              niveau:
                NiveauAvisEtude.VERIFICATEUR,
            },

            orderBy: {
              numeroAvis: "desc",
            },

            select: {
              numeroAvis: true,
            },
          });

        const numeroAvis =
          (dernierAvis?.numeroAvis ??
            0) + 1;

        return tx.avisEtude.create({
          data: {
            etudeOperationId,

            niveau:
              NiveauAvisEtude.VERIFICATEUR,

            decision,

            numeroAvis,

            auteurId,

            observations,

            ...(decision ===
              DecisionAvisEtude.REFUS
              ? {
                  motifsRefus: {
                    create:
                      (
                        motifsRefus ??
                        []
                      ).map(
                        (
                          texte,
                          index
                        ) => ({
                          texte,
                          ordre:
                            index + 1,
                        })
                      ),
                  },
                }
              : {}),
          },

          select: {
            id: true,
            niveau: true,
            decision: true,
            numeroAvis: true,
            observations: true,
            createdAt: true,

            auteur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                login: true,
              },
            },

            motifsRefus: {
              orderBy: {
                ordre: "asc",
              },

              select: {
                id: true,
                texte: true,
                ordre: true,
                createdAt: true,
              },
            },
          },
        });
      }
    );
  }


  /*
   * Charge l'état nécessaire avant une transmission du
   * Vérificateur vers le Super-vérificateur.
   *
   * Les avis REDACTEUR et VERIFICATEUR sont conservés dans
   * leur historique ; le service sélectionne le dernier de
   * chaque niveau pour vérifier la concordance.
   */
  async findEtudeOperationVerificateurPourTransmission(
    etudeOperationId: string,
    utilisateurId: string
  ) {
    return prisma.etudeOperation.findFirst({
      where: {
        id:
          etudeOperationId,

        dossierEtude: {
          is: {
            statut:
              StatutDossierEtude.EN_ETUDE,

            affectations: {
              some: {
                type:
                  TypeAffectationEtude.VERIFICATEUR,

                utilisateurId,

                dateFin: null,
              },
            },
          },
        },
      },

      select: {
        id: true,
        statut: true,
        avisFinalId: true,

        demandeOperationFonciere: {
          select: {
            id: true,

            typeOperationFonciere: {
              select: {
                id: true,
                code: true,
                libelle: true,
                categorie: true,
              },
            },
          },
        },

        avis: {
          where: {
            niveau: {
              in: [
                NiveauAvisEtude.REDACTEUR,
                NiveauAvisEtude.VERIFICATEUR,
              ],
            },
          },

          orderBy: [
            {
              niveau: "asc",
            },
            {
              numeroAvis: "desc",
            },
          ],

          select: {
            id: true,
            niveau: true,
            decision: true,
            numeroAvis: true,
            observations: true,
            createdAt: true,

            motifsRefus: {
              orderBy: {
                ordre: "asc",
              },

              select: {
                id: true,
                texte: true,
                ordre: true,
              },
            },
          },
        },

        minuteInscription: {
          select: {
            id: true,
            modePreparation: true,
            referenceModele: true,
            versionFinaleId: true,

            versions: {
              orderBy: {
                numeroVersion:
                  "desc",
              },

              take: 1,

              select: {
                id: true,
                numeroVersion: true,
                contenu: true,
                niveauAuteur: true,
                createdAt: true,
              },
            },
          },
        },

        dossierEtude: {
          select: {
            id: true,

            affectations: {
              where: {
                dateFin: null,
              },

              select: {
                id: true,
                type: true,
                dateDebut: true,

                utilisateur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                    statut: true,

                    role: {
                      select: {
                        nom: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /*
   * Passage atomique vers le Super-vérificateur.
   *
   * Aucun avis, motif ou contenu de minute n'est réécrit :
   * seul le statut de EtudeOperation change.
   *
   * Si l'opération provenait d'un retour du Super vers le
   * Vérificateur, le RetourCorrection ouvert est marqué
   * comme traité lors de la retransmission.
   */
  async transmettreOperationVerificateurAuSuper(
    etudeOperationId: string,
    utilisateurId: string,
    statutActuel:
      StatutEtudeOperation
  ) {
    return prisma.$transaction(
      async (tx) => {
        const updateResult =
          await tx.etudeOperation
            .updateMany({
              where: {
                id:
                  etudeOperationId,

                statut:
                  statutActuel,

                avisFinalId:
                  null,

                dossierEtude: {
                  is: {
                    statut:
                      StatutDossierEtude.EN_ETUDE,

                    affectations: {
                      some: {
                        type:
                          TypeAffectationEtude.VERIFICATEUR,

                        utilisateurId,

                        dateFin:
                          null,
                      },
                    },
                  },
                },
              },

              data: {
                statut:
                  StatutEtudeOperation.EN_SUPER_VERIFICATION,
              },
            });

        if (
          updateResult.count !== 1
        ) {
          return null;
        }

        if (
          statutActuel ===
          StatutEtudeOperation.A_CORRIGER_VERIFICATEUR
        ) {
          await tx.retourCorrection
            .updateMany({
              where: {
                etudeOperationId,

                versNiveau:
                  NiveauAvisEtude.VERIFICATEUR,

                dateTraitement:
                  null,
              },

              data: {
                dateTraitement:
                  new Date(),
              },
            });
        }

        return tx.etudeOperation
          .findUnique({
            where: {
              id:
                etudeOperationId,
            },

            select: {
              id: true,
              statut: true,
              updatedAt: true,

              demandeOperationFonciere: {
                select: {
                  id: true,

                  typeOperationFonciere: {
                    select: {
                      id: true,
                      code: true,
                      libelle: true,
                      categorie: true,
                    },
                  },
                },
              },

              dossierEtude: {
                select: {
                  affectations: {
                    where: {
                      type:
                        TypeAffectationEtude.SUPER_VERIFICATEUR,

                      dateFin:
                        null,
                    },

                    take: 1,

                    select: {
                      id: true,
                      type: true,
                      dateDebut: true,

                      utilisateur: {
                        select: {
                          id: true,
                          nom: true,
                          prenom: true,
                          login: true,

                          role: {
                            select: {
                              nom: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          });
      }
    );
  }


  /*
   * File personnelle du Super-vérificateur.
   *
   * Un dossier est visible uniquement si le Super-vérificateur
   * connecté possède l'affectation active correspondante.
   *
   * Toutes les opérations du dossier restent visibles pour le
   * contexte, mais seules les opérations EN_SUPER_VERIFICATION
   * sont actuellement à traiter à ce niveau.
   */
  async findDossiersSuperVerificateur(
    utilisateurId: string,
    page: number,
    limit: number,
    search?: string
  ) {
    const skip =
      (page - 1) * limit;

    const normalizedSearch =
      search?.trim();

    const where:
      Prisma.DossierEtudeWhereInput = {
      statut:
        StatutDossierEtude.EN_ETUDE,

      affectations: {
        some: {
          type:
            TypeAffectationEtude.SUPER_VERIFICATEUR,

          utilisateurId,

          dateFin: null,
        },
      },

      ...(normalizedSearch
        ? {
            demande: {
              is: {
                OR: [
                  {
                    numero: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    nomDemandeur: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    prenomDemandeur: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    cin: {
                      contains:
                        normalizedSearch,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    titreFoncier: {
                      is: {
                        numero: {
                          contains:
                            normalizedSearch,
                          mode:
                            "insensitive",
                        },
                      },
                    },
                  },

                  {
                    titreFoncier: {
                      is: {
                        gouvernorat: {
                          nom: {
                            contains:
                              normalizedSearch,
                            mode:
                              "insensitive",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          }
        : {}),
    };

    const [
      data,
      total,
    ] = await Promise.all([
      prisma.dossierEtude.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          dateDistribution:
            "desc",
        },

        select: {
          id: true,
          statut: true,
          dateDistribution: true,
          createdAt: true,
          updatedAt: true,

          demande: {
            select: {
              id: true,
              numero: true,
              nomDemandeur: true,
              prenomDemandeur: true,
              cin: true,
              nature: true,
              statut: true,

              titreFoncier: {
                select: {
                  id: true,
                  numero: true,

                  gouvernorat: {
                    select: {
                      id: true,
                      code: true,
                      nom: true,
                    },
                  },
                },
              },

              journalCloture: {
                select: {
                  id: true,
                  numero: true,
                  dateJour: true,
                },
              },
            },
          },

          affectations: {
            where: {
              dateFin: null,
            },

            orderBy: {
              dateDebut: "asc",
            },

            select: {
              id: true,
              type: true,
              dateDebut: true,

              utilisateur: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  login: true,

                  role: {
                    select: {
                      nom: true,
                    },
                  },
                },
              },
            },
          },

          etudesOperations: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              statut: true,
              createdAt: true,
              updatedAt: true,

              demandeOperationFonciere: {
                select: {
                  id: true,

                  typeOperationFonciere: {
                    select: {
                      id: true,
                      code: true,
                      libelle: true,
                      categorie: true,
                    },
                  },
                },
              },

              /*
               * La file du Super-vérificateur expose le dernier
               * avis du Rédacteur et le dernier avis du Vérificateur.
               * Les anciens avis restent disponibles dans le détail
               * du dossier, qui sera traité séparément.
               */
              avis: {
                where: {
                  niveau: {
                    in: [
                      NiveauAvisEtude.REDACTEUR,
                      NiveauAvisEtude.VERIFICATEUR,
                    ],
                  },
                },

                orderBy: [
                  {
                    niveau: "asc",
                  },
                  {
                    numeroAvis:
                      "desc",
                  },
                ],

                select: {
                  id: true,
                  niveau: true,
                  decision: true,
                  numeroAvis: true,
                  observations: true,
                  createdAt: true,

                  motifsRefus: {
                    orderBy: {
                      ordre:
                        "asc",
                    },

                    select: {
                      id: true,
                      texte: true,
                      ordre: true,
                    },
                  },
                },
              },

              minuteInscription: {
                select: {
                  id: true,
                  modePreparation: true,
                  referenceModele: true,
                  versionFinaleId: true,

                  versions: {
                    orderBy: {
                      numeroVersion:
                        "desc",
                    },

                    take: 1,

                    select: {
                      id: true,
                      numeroVersion: true,
                      contenu: true,
                      niveauAuteur: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      prisma.dossierEtude.count({
        where,
      }),
    ]);

    /*
     * Prisma ne permet pas ici de faire "take: 1 par niveau"
     * dans une seule relation imbriquée. On réduit donc en
     * mémoire l'historique chargé à un avis courant par niveau
     * pour la file de travail.
     */
    const dossiers =
      data.map(
        (dossier) => ({
          ...dossier,

          etudesOperations:
            dossier.etudesOperations.map(
              (operation) => {
                const avisRedacteur =
                  operation.avis.find(
                    (avis) =>
                      avis.niveau ===
                      NiveauAvisEtude.REDACTEUR
                  );

                const avisVerificateur =
                  operation.avis.find(
                    (avis) =>
                      avis.niveau ===
                      NiveauAvisEtude.VERIFICATEUR
                  );

                return {
                  ...operation,

                  avis: [
                    ...(avisRedacteur
                      ? [
                          avisRedacteur,
                        ]
                      : []),

                    ...(avisVerificateur
                      ? [
                          avisVerificateur,
                        ]
                      : []),
                  ],
                };
              }
            ),
        })
      );

    return {
      data:
        dossiers,

      total,
      page,
      limit,

      totalPages:
        Math.ceil(
          total / limit
        ),
    };
  }


  async findDossierSuperVerificateurById(
    dossierId: string,
    utilisateurId: string
  ) {
    return prisma.dossierEtude.findFirst({
      where: {
        id: dossierId,
        statut: StatutDossierEtude.EN_ETUDE,
        affectations: {
          some: {
            type: TypeAffectationEtude.SUPER_VERIFICATEUR,
            utilisateurId,
            dateFin: null,
          },
        },
      },
      select: {
        id: true,
        statut: true,
        dateDistribution: true,
        createdAt: true,
        updatedAt: true,
        demande: {
          select: {
            id: true,
            numero: true,
            nomDemandeur: true,
            prenomDemandeur: true,
            cin: true,
            telephone: true,
            email: true,
            dateNaissanceDemandeur: true,
            adresseDemandeur: true,
            statutVerificationCni: true,
            dateVerificationCni: true,
            sourceVerificationCni: true,
            referenceVerificationCni: true,
            messageVerificationCni: true,
            referenceFonciere: true,
            adresseBien: true,
            observations: true,
            nature: true,
            statut: true,
            titreFoncier: {
              select: {
                id: true,
                numero: true,
                gouvernorat: {
                  select: {
                    id: true,
                    code: true,
                    nom: true,
                  },
                },
              },
            },
            journalCloture: {
              select: {
                id: true,
                numero: true,
                dateJour: true,
                dateCloture: true,
                statut: true,
              },
            },
            documentsTeleverses: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                type: true,
                nomOriginal: true,
                mimeType: true,
                taille: true,
                statut: true,
                motifNonConformite: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            createdAt: true,
            updatedAt: true,
          },
        },
        distribuePar: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            login: true,
            role: {
              select: { nom: true },
            },
          },
        },
        affectations: {
          where: { dateFin: null },
          orderBy: { dateDebut: "asc" },
          select: {
            id: true,
            type: true,
            dateDebut: true,
            dateFin: true,
            utilisateur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                login: true,
                role: {
                  select: { nom: true },
                },
              },
            },
          },
        },
        etudesOperations: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            statut: true,
            avisFinalId: true,
            createdAt: true,
            updatedAt: true,
            demandeOperationFonciere: {
              select: {
                id: true,
                createdAt: true,
                typeOperationFonciere: {
                  select: {
                    id: true,
                    code: true,
                    libelle: true,
                    description: true,
                    categorie: true,
                  },
                },
              },
            },
            avis: {
              orderBy: [
                { niveau: "asc" },
                { numeroAvis: "asc" },
              ],
              select: {
                id: true,
                niveau: true,
                decision: true,
                numeroAvis: true,
                observations: true,
                createdAt: true,
                updatedAt: true,
                auteur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },
                motifsRefus: {
                  orderBy: { ordre: "asc" },
                  select: {
                    id: true,
                    texte: true,
                    ordre: true,
                    createdAt: true,
                  },
                },
              },
            },
            minuteInscription: {
              select: {
                id: true,
                modePreparation: true,
                referenceModele: true,
                versionFinaleId: true,
                createdAt: true,
                updatedAt: true,
                versions: {
                  orderBy: { numeroVersion: "asc" },
                  select: {
                    id: true,
                    numeroVersion: true,
                    contenu: true,
                    niveauAuteur: true,
                    createdAt: true,
                    auteur: {
                      select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        login: true,
                      },
                    },
                  },
                },
              },
            },
            retoursCorrection: {
              orderBy: { dateRetour: "asc" },
              select: {
                id: true,
                deNiveau: true,
                versNiveau: true,
                motif: true,
                dateRetour: true,
                dateTraitement: true,
                createdAt: true,
                auteur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },
                destinataire: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }


  /*
   * Charge une opération pour le Super-vérificateur
   * actuellement affecté au dossier.
   *
   * Les derniers avis du Rédacteur et du Vérificateur
   * sont utilisés uniquement comme contexte de comparaison.
   */
  async findEtudeOperationSuperVerificateurById(
    etudeOperationId: string,
    utilisateurId: string
  ) {
    return prisma.etudeOperation.findFirst({
      where: {
        id:
          etudeOperationId,

        dossierEtude: {
          is: {
            statut:
              StatutDossierEtude.EN_ETUDE,

            affectations: {
              some: {
                type:
                  TypeAffectationEtude.SUPER_VERIFICATEUR,

                utilisateurId,

                dateFin: null,
              },
            },
          },
        },
      },

      select: {
        id: true,
        statut: true,
        avisFinalId: true,

        demandeOperationFonciere: {
          select: {
            id: true,

            typeOperationFonciere: {
              select: {
                id: true,
                code: true,
                libelle: true,
                categorie: true,
              },
            },
          },
        },

        avis: {
          where: {
            niveau: {
              in: [
                NiveauAvisEtude.REDACTEUR,
                NiveauAvisEtude.VERIFICATEUR,
              ],
            },
          },

          orderBy: [
            {
              niveau: "asc",
            },
            {
              numeroAvis: "desc",
            },
          ],

          select: {
            id: true,
            niveau: true,
            decision: true,
            numeroAvis: true,
            observations: true,
            createdAt: true,

            motifsRefus: {
              orderBy: {
                ordre: "asc",
              },

              select: {
                id: true,
                texte: true,
                ordre: true,
              },
            },
          },
        },

        minuteInscription: {
          select: {
            id: true,
            modePreparation: true,
            referenceModele: true,
            versionFinaleId: true,

            versions: {
              orderBy: {
                numeroVersion:
                  "desc",
              },

              take: 1,

              select: {
                id: true,
                numeroVersion: true,
                contenu: true,
                niveauAuteur: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  /*
   * Enregistre un nouvel avis du Super-vérificateur.
   *
   * Chaque sauvegarde crée un nouvel AvisEtude afin de
   * conserver l'historique. Cette action ne finalise pas
   * l'opération et ne définit pas encore avisFinalId.
   *
   * La modification éventuelle de la minute par le
   * Super-vérificateur sera gérée par une action dédiée.
   */
  async enregistrerAvisSuperVerificateur(
    etudeOperationId: string,
    auteurId: string,
    decision:
      DecisionAvisEtude,
    observations?: string,
    motifsRefus?: string[]
  ) {
    return prisma.$transaction(
      async (tx) => {
        const dernierAvis =
          await tx.avisEtude.findFirst({
            where: {
              etudeOperationId,

              niveau:
                NiveauAvisEtude.SUPER_VERIFICATEUR,
            },

            orderBy: {
              numeroAvis: "desc",
            },

            select: {
              numeroAvis: true,
            },
          });

        const numeroAvis =
          (dernierAvis?.numeroAvis ??
            0) + 1;

        return tx.avisEtude.create({
          data: {
            etudeOperationId,

            niveau:
              NiveauAvisEtude.SUPER_VERIFICATEUR,

            decision,

            numeroAvis,

            auteurId,

            observations,

            ...(decision ===
              DecisionAvisEtude.REFUS
              ? {
                  motifsRefus: {
                    create:
                      (
                        motifsRefus ??
                        []
                      ).map(
                        (
                          texte,
                          index
                        ) => ({
                          texte,
                          ordre:
                            index + 1,
                        })
                      ),
                  },
                }
              : {}),
          },

          select: {
            id: true,
            niveau: true,
            decision: true,
            numeroAvis: true,
            observations: true,
            createdAt: true,

            auteur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                login: true,
              },
            },

            motifsRefus: {
              orderBy: {
                ordre: "asc",
              },

              select: {
                id: true,
                texte: true,
                ordre: true,
                createdAt: true,
              },
            },
          },
        });
      }
    );
  }


  /*
   * Charge une opération et sa minute pour une modification
   * directe par le Super-vérificateur.
   */
  async findMinuteSuperVerificateurByOperationId(
    etudeOperationId: string,
    utilisateurId: string
  ) {
    return prisma.etudeOperation.findFirst({
      where: {
        id: etudeOperationId,

        dossierEtude: {
          is: {
            statut:
              StatutDossierEtude.EN_ETUDE,

            affectations: {
              some: {
                type:
                  TypeAffectationEtude.SUPER_VERIFICATEUR,

                utilisateurId,

                dateFin: null,
              },
            },
          },
        },
      },

      select: {
        id: true,
        statut: true,
        avisFinalId: true,

        avis: {
          where: {
            niveau:
              NiveauAvisEtude.SUPER_VERIFICATEUR,
          },

          orderBy: {
            numeroAvis: "desc",
          },

          take: 1,

          select: {
            id: true,
            decision: true,
            numeroAvis: true,
            createdAt: true,
          },
        },

        minuteInscription: {
          select: {
            id: true,
            modePreparation: true,
            referenceModele: true,
            versionFinaleId: true,

            versions: {
              orderBy: {
                numeroVersion: "desc",
              },

              take: 1,

              select: {
                id: true,
                numeroVersion: true,
                contenu: true,
                niveauAuteur: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  /*
   * Ajoute une nouvelle version immuable de la minute.
   * L'ancienne version n'est jamais écrasée.
   */
  async modifierMinuteSuperVerificateur(
    minuteInscriptionId: string,
    auteurId: string,
    contenu: string
  ) {
    return prisma.$transaction(
      async (tx) => {
        const derniereVersion =
          await tx.versionMinute.findFirst({
            where: {
              minuteInscriptionId,
            },

            orderBy: {
              numeroVersion: "desc",
            },

            select: {
              numeroVersion: true,
            },
          });

        const numeroVersion =
          (derniereVersion?.numeroVersion ??
            0) + 1;

        return tx.versionMinute.create({
          data: {
            minuteInscriptionId,
            numeroVersion,
            contenu,
            auteurId,
            niveauAuteur:
              NiveauAvisEtude.SUPER_VERIFICATEUR,
          },

          select: {
            id: true,
            numeroVersion: true,
            contenu: true,
            niveauAuteur: true,
            createdAt: true,

            auteur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                login: true,
              },
            },

            minuteInscription: {
              select: {
                id: true,
                modePreparation: true,
                referenceModele: true,
                versionFinaleId: true,
              },
            },
          },
        });
      }
    );
  }

}
