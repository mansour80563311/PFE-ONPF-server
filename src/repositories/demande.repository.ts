import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

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



 


