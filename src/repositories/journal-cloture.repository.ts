import {
    Prisma,
    StatutDemande,
} from "@prisma/client";

import prisma from "../config/prisma";

interface CreateJournalParams {
  numero: string;
  dateJour: Date;
  responsableId: string;
  observations?: string | null;
  demandeIds: string[];
}

export class JournalClotureRepository {
  async findByDate(dateJour: Date) {
    return prisma.journalCloture.findUnique({
      where: {
        dateJour,
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

        statut: {
          in: [
            StatutDemande.VALIDEE,
            StatutDemande.REJETEE,
          ],
        },

        historiqueStatuts: {
          some: {
            nouveauStatut: {
              in: [
                StatutDemande.VALIDEE,
                StatutDemande.REJETEE,
              ],
            },

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
        referenceFonciere: true,
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
    return prisma.$transaction(async (tx) => {
      const journal =
        await tx.journalCloture.create({
          data: {
            numero,
            dateJour,
            observations:
              observations || null,

            responsable: {
              connect: {
                id: responsableId,
              },
            },

            demandes: {
              connect: demandeIds.map((id) => ({
                id,
              })),
            },
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

            demandes: {
              select: {
                id: true,
                numero: true,
                nomDemandeur: true,
                prenomDemandeur: true,
                statut: true,
              },
            },
          },
        });

      return journal;
    });
  }

  private buildSearchFilter(
    search?: string
    ): Prisma.JournalClotureWhereInput {
    if (!search) {
        return {};
    }

    return {
        OR: [
        {
            numero: {
            contains: search,
            mode: "insensitive",
            },
        },

        {
            observations: {
            contains: search,
            mode: "insensitive",
            },
        },

        {
            responsable: {
            is: {
                nom: {
                contains: search,
                mode: "insensitive",
                },
            },
            },
        },

        {
            responsable: {
            is: {
                prenom: {
                contains: search,
                mode: "insensitive",
                },
            },
            },
        },

        {
            responsable: {
            is: {
                login: {
                contains: search,
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
    const skip = (page - 1) * limit;

    const where =
        this.buildSearchFilter(search);

    const [data, total] =
        await Promise.all([
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
        totalPages: Math.ceil(
        total / limit
        ),
    };
    }

    async findById(id: string) {
    return prisma.journalCloture.findUnique({
        where: {
        id,
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

        demandes: {
            orderBy: {
            numero: "asc",
            },

            select: {
            id: true,
            numero: true,
            nomDemandeur: true,
            prenomDemandeur: true,
            cin: true,
            referenceFonciere: true,
            statut: true,
            motifRejet: true,
            updatedAt: true,
            },
        },
        },
    });
    }
}