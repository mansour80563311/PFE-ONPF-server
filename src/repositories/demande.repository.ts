import {
  NatureDemande,
  Prisma,
  StatutDemande,
} from "@prisma/client";

import prisma from "../config/prisma";


/**
 * ============================================================
 * SELECTION PUBLIQUE DU PAIEMENT
 * ============================================================
 */
const paiementPublicSelect = {
  id: true,
  numeroRecu: true,
  statut: true,
  montantExigible: true,
  montantEncaisse: true,
  datePaiement: true,
} satisfies Prisma.PaiementSelect;


/**
 * ============================================================
 * SELECTION PUBLIQUE DE L'UTILISATEUR
 * ============================================================
 *
 * Le mot de passe est volontairement exclu.
 */
const utilisateurPublicSelect = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  login: true,
  statut: true,
  roleId: true,
  createdAt: true,
  updatedAt: true,

  role: {
    select: {
      id: true,
      nom: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UtilisateurSelect;


export class DemandeRepository {
  /**
   * ==========================================================
   * FILTRE DE RECHERCHE
   * ==========================================================
   *
   * La recherche porte maintenant sur :
   *
   * - numéro de la demande ;
   * - nom ;
   * - prénom ;
   * - CIN ;
   * - ancienne référence foncière ;
   * - adresse du bien ;
   * - nature ;
   * - numéro du titre foncier ;
   * - gouvernorat ;
   * - opérations foncières ;
   * - prestation.
   */
  private buildSearchFilter(
    search?: string
  ): Prisma.DemandeWhereInput {
    const normalizedSearch =
      search?.trim();

    if (!normalizedSearch) {
      return {};
    }


    /**
     * Permet de rechercher :
     *
     * inscription
     * INSCRIPTION
     * prestation
     * PRESTATION
     */
    const upperSearch =
      normalizedSearch
        .toUpperCase();


    const orFilters:
      Prisma.DemandeWhereInput[] =
        [
          /**
           * Numéro de la demande.
           *
           * Exemple :
           * DF-2026-000027
           */
          {
            numero: {
              contains:
                normalizedSearch,

              mode:
                "insensitive",
            },
          },


          /**
           * Nom du demandeur.
           */
          {
            nomDemandeur: {
              contains:
                normalizedSearch,

              mode:
                "insensitive",
            },
          },


          /**
           * Prénom du demandeur.
           */
          {
            prenomDemandeur: {
              contains:
                normalizedSearch,

              mode:
                "insensitive",
            },
          },


          /**
           * CIN.
           */
          {
            cin: {
              contains:
                normalizedSearch,

              mode:
                "insensitive",
            },
          },


          /**
           * Ancienne référence foncière.
           *
           * Conservée pendant la période
           * de migration.
           */
          {
            referenceFonciere: {
              contains:
                normalizedSearch,

              mode:
                "insensitive",
            },
          },


          /**
           * Adresse du bien.
           */
          {
            adresseBien: {
              contains:
                normalizedSearch,

              mode:
                "insensitive",
            },
          },


          /**
           * ==================================================
           * TITRE FONCIER
           * ==================================================
           *
           * Recherche par numéro.
           *
           * Exemple :
           * 45876
           */
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


          /**
           * Recherche par nom du gouvernorat.
           *
           * Exemple :
           * Tunis
           */
          {
            titreFoncier: {
              is: {
                gouvernorat: {
                  is: {
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
          },


          /**
           * Recherche par code du gouvernorat.
           *
           * Exemple :
           * TUNIS
           */
          {
            titreFoncier: {
              is: {
                gouvernorat: {
                  is: {
                    code: {
                      contains:
                        normalizedSearch,

                      mode:
                        "insensitive",
                    },
                  },
                },
              },
            },
          },


          /**
           * ==================================================
           * OPERATIONS FONCIERES
           * ==================================================
           *
           * Recherche par code.
           *
           * Exemple :
           * VENTE
           * HYPOTHEQUE
           */
          {
            operationsFoncieres: {
              some: {
                typeOperationFonciere: {
                  is: {
                    code: {
                      contains:
                        normalizedSearch,

                      mode:
                        "insensitive",
                    },
                  },
                },
              },
            },
          },


          /**
           * Recherche par libellé.
           *
           * Exemple :
           * Vente
           * Hypothèque
           */
          {
            operationsFoncieres: {
              some: {
                typeOperationFonciere: {
                  is: {
                    libelle: {
                      contains:
                        normalizedSearch,

                      mode:
                        "insensitive",
                    },
                  },
                },
              },
            },
          },


          /**
           * ==================================================
           * PRESTATION
           * ==================================================
           *
           * Recherche par code.
           *
           * Exemple :
           * CERTIFICAT_PROPRIETE
           */
          {
            prestation: {
              is: {
                code: {
                  contains:
                    normalizedSearch,

                  mode:
                    "insensitive",
                },
              },
            },
          },


          /**
           * Recherche par libellé.
           *
           * Exemple :
           * Certificat de propriété
           */
          {
            prestation: {
              is: {
                libelle: {
                  contains:
                    normalizedSearch,

                  mode:
                    "insensitive",
                },
              },
            },
          },


          /**
           * ==================================================
           * SNAPSHOT TARIFAIRE
           * ==================================================
           *
           * Utile notamment lorsque la prestation
           * enregistrée dans le snapshot doit être
           * retrouvée.
           */
          {
            tarification: {
              is: {
                prestationCode: {
                  contains:
                    normalizedSearch,

                  mode:
                    "insensitive",
                },
              },
            },
          },


          {
            tarification: {
              is: {
                prestationLibelle: {
                  contains:
                    normalizedSearch,

                  mode:
                    "insensitive",
                },
              },
            },
          },
        ];


    /**
     * ========================================================
     * RECHERCHE PAR NATURE
     * ========================================================
     *
     * Comme nature est un ENUM Prisma,
     * on ne peut pas utiliser contains.
     *
     * On ajoute donc une condition exacte
     * lorsqu'un des deux mots est saisi.
     */
    if (
      upperSearch ===
      "INSCRIPTION"
    ) {
      orFilters.push({
        nature:
          NatureDemande
            .INSCRIPTION,
      });
    }


    if (
      upperSearch ===
      "PRESTATION"
    ) {
      orFilters.push({
        nature:
          NatureDemande
            .PRESTATION,
      });
    }


    return {
      OR:
        orFilters,
    };
  }


  /**
   * ==========================================================
   * CREATION
   * ==========================================================
   */
  async create(
    data:
      Prisma.DemandeCreateInput
  ) {
    return prisma.demande.create({
      data,

      include: {
        utilisateur: {
          select:
            utilisateurPublicSelect,
        },


        /**
         * Nouveau titre foncier.
         */
        titreFoncier: {
          include: {
            gouvernorat:
              true,
          },
        },


        /**
         * Opérations de la demande.
         */
        operationsFoncieres: {
          include: {
            typeOperationFonciere:
              true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },


        /**
         * Prestation éventuelle.
         */
        prestation:
          true,


        /**
         * Snapshot tarifaire.
         */
        tarification: {
          include: {
            lignes: {
              orderBy: {
                ordre:
                  "asc",
              },
            },
          },
        },
      },
    });
  }


  /**
   * ==========================================================
   * LISTE PAGINEE
   * ==========================================================
   */
  async findAll(
    page: number,
    limit: number,
    search?: string,
    accessFilter:
      Prisma.DemandeWhereInput = {}
  ) {
    const skip =
      (page - 1) *
      limit;


    const searchFilter =
      this.buildSearchFilter(
        search
      );


    /**
     * Le filtre d'accès dépend du rôle :
     *
     * ADMIN
     * AGENT
     * CAISSIER
     * RESPONSABLE
     *
     * Il est combiné au filtre de recherche.
     */
    const where:
      Prisma.DemandeWhereInput =
        {
          AND: [
            accessFilter,
            searchFilter,
          ],
        };


    const [
      data,
      total,
    ] = await Promise.all([
      /**
       * ------------------------------------------------------
       * DONNEES
       * ------------------------------------------------------
       */
      prisma.demande.findMany({
        where,

        skip,

        take:
          limit,

        orderBy: {
          createdAt:
            "desc",
        },


        /**
         * Toutes les informations nécessaires
         * au futur tableau React sont maintenant
         * directement retournées.
         */
        include: {
          utilisateur: {
            select:
              utilisateurPublicSelect,
          },


          /**
           * Paiement.
           */
          paiement: {
            select:
              paiementPublicSelect,
          },


          /**
           * Titre foncier +
           * gouvernorat.
           */
          titreFoncier: {
            include: {
              gouvernorat:
                true,
            },
          },


          /**
           * Opérations foncières.
           */
          operationsFoncieres: {
            include: {
              typeOperationFonciere:
                true,
            },

            orderBy: {
              createdAt:
                "asc",
            },
          },


          /**
           * Prestation.
           */
          prestation:
            true,


          /**
           * Tarification réglementaire.
           */
          tarification: {
            include: {
              lignes: {
                orderBy: {
                  ordre:
                    "asc",
                },
              },
            },
          },
        },
      }),


      /**
       * ------------------------------------------------------
       * TOTAL POUR LA PAGINATION
       * ------------------------------------------------------
       */
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
          total /
          limit
        ),
    };
  }


  /**
   * ==========================================================
   * RECHERCHE PAR ID
   * ==========================================================
   */
  async findById(
    id: string
  ) {
    return prisma.demande.findUnique({
      where: {
        id,
      },

      include: {
        utilisateur: {
          select:
            utilisateurPublicSelect,
        },


        paiement: {
          select:
            paiementPublicSelect,
        },


        journalCloture: {
          include: {
            responsable: {
              select: {
                id:
                  true,

                nom:
                  true,

                prenom:
                  true,

                login:
                  true,
              },
            },
          },
        },


        /**
         * Informations normalisées
         * du titre foncier.
         */
        titreFoncier: {
          include: {
            gouvernorat:
              true,
          },
        },


        /**
         * Opérations foncières.
         */
        operationsFoncieres: {
          include: {
            typeOperationFonciere:
              true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },


        /**
         * Prestation sélectionnée.
         */
        prestation:
          true,


        /**
         * Détail du calcul tarifaire.
         */
        tarification: {
          include: {
            lignes: {
              orderBy: {
                ordre:
                  "asc",
              },
            },
          },
        },
      },
    });
  }


  /**
   * ==========================================================
   * MODIFICATION
   * ==========================================================
   */
  async update(
    id: string,
    data:
      Prisma.DemandeUpdateInput
  ) {
    return prisma.demande.update({
      where: {
        id,
      },

      data,

      include: {
        utilisateur: {
          select:
            utilisateurPublicSelect,
        },


        paiement: {
          select:
            paiementPublicSelect,
        },


        journalCloture: {
          include: {
            responsable: {
              select: {
                id:
                  true,

                nom:
                  true,

                prenom:
                  true,

                login:
                  true,
              },
            },
          },
        },


        titreFoncier: {
          include: {
            gouvernorat:
              true,
          },
        },


        operationsFoncieres: {
          include: {
            typeOperationFonciere:
              true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },


        prestation:
          true,


        tarification: {
          include: {
            lignes: {
              orderBy: {
                ordre:
                  "asc",
              },
            },
          },
        },
      },
    });
  }


  /**
   * ==========================================================
   * MODIFICATION DU STATUT + HISTORIQUE
   * ==========================================================
   */
  async updateStatusWithHistory(
    params: {
      id:
        string;

      ancienStatut:
        StatutDemande;

      nouveauStatut:
        StatutDemande;

      motifRejet?:
        string |
        null;

      utilisateurId:
        string;
    }
  ) {
    const {
      id,
      ancienStatut,
      nouveauStatut,
      motifRejet,
      utilisateurId,
    } = params;


    return prisma.$transaction(
      async (tx) => {
        /**
         * Modification de la demande.
         */
        const demande =
          await tx.demande.update({
            where: {
              id,
            },

            data: {
              statut:
                nouveauStatut,

              motifRejet:
                nouveauStatut ===
                StatutDemande.REJETEE
                  ? motifRejet ??
                    null
                  : null,
            },

            include: {
              utilisateur: {
                select:
                  utilisateurPublicSelect,
              },
            },
          });


        /**
         * Historisation du changement.
         */
        await tx
          .historiqueStatutDemande
          .create({
            data: {
              ancienStatut,

              nouveauStatut,

              motif:
                nouveauStatut ===
                StatutDemande.REJETEE
                  ? motifRejet ??
                    null
                  : null,

              demande: {
                connect: {
                  id,
                },
              },

              utilisateur: {
                connect: {
                  id:
                    utilisateurId,
                },
              },
            },
          });


        return demande;
      }
    );
  }


  /**
   * ==========================================================
   * SUPPRESSION
   * ==========================================================
   */
  async delete(
    id: string
  ) {
    return prisma.demande.delete({
      where: {
        id,
      },
    });
  }


  /**
   * ==========================================================
   * DERNIER NUMERO
   * ==========================================================
   */
  async findLastNumero() {
    return prisma.demande.findFirst({
      orderBy: {
        createdAt:
          "desc",
      },

      select: {
        numero:
          true,
      },
    });
  }


  /**
   * ==========================================================
   * HISTORIQUE D'UNE DEMANDE
   * ==========================================================
   */
  async findHistoryByDemandeId(
    demandeId: string
  ) {
    return prisma
      .historiqueStatutDemande
      .findMany({
        where: {
          demandeId,
        },

        orderBy: {
          createdAt:
            "asc",
        },

        include: {
          utilisateur: {
            select: {
              id:
                true,

              nom:
                true,

              prenom:
                true,

              login:
                true,
            },
          },
        },
      });
  }


  /**
   * ==========================================================
   * RECHERCHE LEGACY
   * ==========================================================
   *
   * Conservée temporairement pour les
   * anciennes fonctionnalités.
   *
   * Il ne s'agit plus d'une contrainte
   * d'unicité métier.
   */
  async findByCinAndReference(
    cin: string,
    referenceFonciere: string
  ) {
    return prisma.demande.findFirst({
      where: {
        cin,

        referenceFonciere,
      },
    });
  }
}