import prisma from "../config/prisma";
import { 
  Prisma,
  StatutDemande,

} from "@prisma/client";

export class DemandeRepository {
private buildSearchFilter(
  search?: string
): Prisma.DemandeWhereInput {

  if (!search) return {};

  return {
    OR: [
      {
        numero: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nomDemandeur: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        prenomDemandeur: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        cin: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        referenceFonciere: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        adresseBien: {
            contains: search,
            mode: "insensitive",
        },
      },
    ],
  };
}


  async create(data: Prisma.DemandeCreateInput) {
    return prisma.demande.create({
      data,
      include: {
        utilisateur: {
          include: {
            role: true,
          },
        },
      },
    });
  }
  // Méthode pour récupérer toutes les demandes avec pagination et recherche
  async findAll(
    page: number,
    limit: number,
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const where = this.buildSearchFilter(search);

    const [data, total] = await Promise.all([
      prisma.demande.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          utilisateur: {
            include: {
              role: true,
            },
          },
        },
      }),
      prisma.demande.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return prisma.demande.findUnique({
      where: { id },
      include: {
        utilisateur: {
          include: {
            role: true,
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
      where: { id },
      data,
      include: {
        utilisateur: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async updateStatusWithHistory(params: {
      id: string;
      ancienStatut: StatutDemande;
      nouveauStatut: StatutDemande;
      motifRejet?: string | null;
      utilisateurId: string;
    }) {
      const {
        id,
        ancienStatut,
        nouveauStatut,
        motifRejet,
        utilisateurId,
      } = params;

      return prisma.$transaction(async (tx) => {
        const demande =
          await tx.demande.update({
            where: {
              id,
            },
            data: {
              statut: nouveauStatut,

              motifRejet:
                nouveauStatut ===
                StatutDemande.REJETEE
                  ? motifRejet ?? null
                  : null,
            },
            include: {
              utilisateur: {
                include: {
                  role: true,
                },
              },
            },
          });

        await tx.historiqueStatutDemande.create({
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
      });
  }

  async delete(id: string) {
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
      return prisma.historiqueStatutDemande.findMany({
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

  // Méthode pour trouver une demande par CIN et référence foncière
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



 


