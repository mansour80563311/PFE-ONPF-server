import {
  Prisma,
  StatutDemande,
  StatutJournalCloture,
  TypeEvenementJournalCloture,
} from "@prisma/client";

import prisma from "../config/prisma";

interface CreateJournalParams {
  numero: string;
  dateJour: Date;
  responsableId: string;
  observations?: string | null;
  demandeIds: string[];
}

interface RecloseJournalParams {
  journalId: string;
  responsableId: string;
  observations?: string | null;
  demandeIds: string[];
}

interface DeclotureJournalParams {
  journalId: string;
  adminId: string;
  motif: string;
}

const journalDetailInclude = {
  responsable: {
    select: {
      id: true,
      nom: true,
      prenom: true,
      login: true,
    },
  },

  demandes: {
    orderBy: {
      numero: "asc" as const,
    },

    select: {
      id: true,
      numero: true,
      nomDemandeur: true,
      prenomDemandeur: true,
      cin: true,
      nature: true,

      titreFoncier: {
        select: {
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

      prestation: {
        select: {
          id: true,
          code: true,
          libelle: true,
        },
      },

      referenceFonciere: true,
      statut: true,
      motifRejet: true,
      updatedAt: true,
    },
  },

  evenements: {
    orderBy: {
      dateEvenement: "asc" as const,
    },

    include: {
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
} satisfies Prisma.JournalClotureInclude;

export class JournalClotureRepository {
  async findByDate(
    dateJour: Date
  ) {
    return prisma.journalCloture.findUnique({
      where: {
        dateJour,
      },

      include: {
        _count: {
          select: {
            demandes: true,
          },
        },
      },
    });
  }

  async findLastNumeroByYear(
    year: number
  ) {
    return prisma.journalCloture.findFirst({
      where: {
        numero: {
          startsWith: `JC-${year}-`,
        },
      },

      orderBy: {
        numero: "desc",
      },

      select: {
        numero: true,
      },
    });
  }

  async findEligibleDemandes(
    startDate: Date,
    endDate: Date
  ) {
    return prisma.demande.findMany({
      where: {
        journalClotureId: null,
        statut: StatutDemande.VALIDEE,

        historiqueStatuts: {
          some: {
            nouveauStatut:
              StatutDemande.VALIDEE,

            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },

      orderBy: {
        updatedAt: "asc",
      },

      select: {
        id: true,
        numero: true,
        nomDemandeur: true,
        prenomDemandeur: true,
        cin: true,
        nature: true,

        titreFoncier: {
          select: {
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

        prestation: {
          select: {
            id: true,
            code: true,
            libelle: true,
          },
        },

        referenceFonciere: true,
        statut: true,
        updatedAt: true,
      },
    });
  }

  async findDemandesEnCoursForDay(
    startDate: Date,
    endDate: Date
  ) {
    return prisma.demande.findMany({
      where: {
        statut:
          StatutDemande.EN_COURS,

        historiqueStatuts: {
          some: {
            nouveauStatut:
              StatutDemande.EN_COURS,

            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },

      orderBy: {
        updatedAt: "asc",
      },

      select: {
        id: true,
        numero: true,
        nomDemandeur: true,
        prenomDemandeur: true,
        statut: true,
        updatedAt: true,
      },
    });
  }

  async createWithDemandes({
    numero,
    dateJour,
    responsableId,
    observations,
    demandeIds,
  }: CreateJournalParams) {
    return prisma.$transaction(
      async (tx) => {
        const journal =
          await tx.journalCloture.create({
            data: {
              numero,
              dateJour,
              statut:
                StatutJournalCloture.CLOTURE,

              observations:
                observations || null,

              responsable: {
                connect: {
                  id: responsableId,
                },
              },

              demandes: {
                connect: demandeIds.map(
                  (id) => ({ id })
                ),
              },
            },
          });

        await tx.journalClotureEvenement.create({
          data: {
            journalClotureId:
              journal.id,
            type:
              TypeEvenementJournalCloture.CLOTURE,
            auteurId:
              responsableId,
            motif:
              observations || null,
            dateEvenement:
              journal.dateCloture,
          },
        });

        return tx.journalCloture.findUniqueOrThrow({
          where: {
            id: journal.id,
          },
          include:
            journalDetailInclude,
        });
      }
    );
  }

  async recloseWithDemandes({
    journalId,
    responsableId,
    observations,
    demandeIds,
  }: RecloseJournalParams) {
    return prisma.$transaction(
      async (tx) => {
        const now = new Date();

        await tx.journalCloture.update({
          where: {
            id: journalId,
          },

          data: {
            statut:
              StatutJournalCloture.CLOTURE,
            dateCloture: now,
            responsableId,
            observations:
              observations || null,

            ...(demandeIds.length > 0 && {
              demandes: {
                connect: demandeIds.map(
                  (id) => ({ id })
                ),
              },
            }),
          },
        });

        await tx.journalClotureEvenement.create({
          data: {
            journalClotureId:
              journalId,
            type:
              TypeEvenementJournalCloture.CLOTURE,
            auteurId:
              responsableId,
            motif:
              observations || null,
            dateEvenement: now,
          },
        });

        return tx.journalCloture.findUniqueOrThrow({
          where: {
            id: journalId,
          },
          include:
            journalDetailInclude,
        });
      }
    );
  }

  async decloture({
    journalId,
    adminId,
    motif,
  }: DeclotureJournalParams) {
    return prisma.$transaction(
      async (tx) => {
        const journal =
          await tx.journalCloture.findUniqueOrThrow({
            where: {
              id: journalId,
            },
          });

        const clotureEvent =
          await tx.journalClotureEvenement.findFirst({
            where: {
              journalClotureId:
                journalId,
              type:
                TypeEvenementJournalCloture.CLOTURE,
            },
          });

        /*
         * Les journaux créés avant la migration de la déclôture
         * n'ont pas encore d'événement CLOTURE. On crée une trace
         * historique à partir des informations déjà présentes.
         */
        if (!clotureEvent) {
          await tx.journalClotureEvenement.create({
            data: {
              journalClotureId:
                journalId,
              type:
                TypeEvenementJournalCloture.CLOTURE,
              auteurId:
                journal.responsableId,
              motif:
                journal.observations || null,
              dateEvenement:
                journal.dateCloture,
            },
          });
        }

        const now = new Date();

        await tx.journalCloture.update({
          where: {
            id: journalId,
          },

          data: {
            statut:
              StatutJournalCloture.DECLOTUREE,
          },
        });

        await tx.journalClotureEvenement.create({
          data: {
            journalClotureId:
              journalId,
            type:
              TypeEvenementJournalCloture.DECLOTURE,
            auteurId:
              adminId,
            motif,
            dateEvenement: now,
          },
        });

        return tx.journalCloture.findUniqueOrThrow({
          where: {
            id: journalId,
          },
          include:
            journalDetailInclude,
        });
      }
    );
  }

  private buildSearchFilter(
    search?: string
  ): Prisma.JournalClotureWhereInput {
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
          observations: {
            contains:
              normalizedSearch,
            mode: "insensitive",
          },
        },
        {
          responsable: {
            is: {
              nom: {
                contains:
                  normalizedSearch,
                mode: "insensitive",
              },
            },
          },
        },
        {
          responsable: {
            is: {
              prenom: {
                contains:
                  normalizedSearch,
                mode: "insensitive",
              },
            },
          },
        },
        {
          responsable: {
            is: {
              login: {
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

  async findAll(
    page: number,
    limit: number,
    search?: string
  ) {
    const skip =
      (page - 1) * limit;

    const where =
      this.buildSearchFilter(
        search
      );

    const [
      data,
      total,
    ] = await Promise.all([
      prisma.journalCloture.findMany({
        where,
        skip,
        take: limit,

        orderBy: {
          dateJour: "desc",
        },

        include: {
          responsable: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              login: true,
            },
          },

          _count: {
            select: {
              demandes: true,
            },
          },
        },
      }),

      prisma.journalCloture.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages:
        Math.ceil(total / limit),
    };
  }

  async findById(
    id: string
  ) {
    return prisma.journalCloture.findUnique({
      where: {
        id,
      },
      include:
        journalDetailInclude,
    });
  }
}