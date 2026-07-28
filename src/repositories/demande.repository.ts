import {
  Prisma,
  StatutDemande,
} from "@prisma/client";

import prisma from "../config/prisma";

/*
 * Sélection publique d’un utilisateur.
 *
 * Le champ password est volontairement exclu
 * afin que le hash du mot de passe ne soit
 * jamais retourné dans les réponses de l’API.
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
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          nomDemandeur: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          prenomDemandeur: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          cin: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          referenceFonciere: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },

        {
          adresseBien: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
      ],
    };
  }

  async create(
    data: Prisma.DemandeCreateInput
  ) {
    return prisma.demande.create({
      data,

      include: {
        utilisateur: {
          select:
            utilisateurPublicSelect,
        },
      },
    });
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    accessFilter:
      Prisma.DemandeWhereInput = {}
  ) {
    const skip =
      (page - 1) * limit;

    const searchFilter =
      this.buildSearchFilter(
        search
      );

    /*
     * Le filtre de recherche et le filtre
     * d’autorisation sont appliqués
     * simultanément.
     */
    const where:
      Prisma.DemandeWhereInput = {
        AND: [
          accessFilter,
          searchFilter,
        ],
      };

    const [
      data,
      total,
    ] = await Promise.all([
      prisma.demande.findMany({
        where,
        skip,
        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          utilisateur: {
            select:
              utilisateurPublicSelect,
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

        journalCloture: {
          include: {
            responsable: {
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
    });
  }

  async update(
    id: string,
    data: Prisma.DemandeUpdateInput
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
      },
    });
  }

  async updateStatusWithHistory(
    params: {
      id: string;
      ancienStatut: StatutDemande;
      nouveauStatut: StatutDemande;
      motifRejet?: string | null;
      utilisateurId: string;
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
                  ? motifRejet ?? null
                  : null,
            },

            include: {
              utilisateur: {
                select:
                  utilisateurPublicSelect,
              },
            },
          });

        await tx
          .historiqueStatutDemande
          .create({
            data: {
              ancienStatut,
              nouveauStatut,

              motif:
                nouveauStatut ===
                StatutDemande.REJETEE
                  ? motifRejet ?? null
                  : null,

              demande: {
                connect: {
                  id,
                },
              },

              utilisateur: {
                connect: {
                  id: utilisateurId,
                },
              },
            },
          });

        return demande;
      }
    );
  }

  async delete(
    id: string
  ) {
    return prisma.demande.delete({
      where: {
        id,
      },
    });
  }

  async findLastNumero() {
    return prisma.demande.findFirst({
      orderBy: {
        createdAt: "desc",
      },

      select: {
        numero: true,
      },
    });
  }

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
          createdAt: "asc",
        },

        include: {
          utilisateur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              login: true,
            },
          },
        },
      });
  }

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