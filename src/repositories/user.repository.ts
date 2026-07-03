/* 
Pourquoi faire autant de méthodes ?

Parce que dans le UserService, nous ne voulons jamais écrire 
directement du Prisma.

  */
import prisma from "../config/prisma";

export class UserRepository {

    // Méthode pour récupérer tous les utilisateurs avec pagination et recherche
  async findAll(skip: number, take: number, search?: string) {
    return prisma.utilisateur.findMany({
      where: search
        ? {
            OR: [
              {
                nom: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                prenom: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                login: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
      include: {
        role: true,
      },
      skip,
      take,
      orderBy: {
        nom: "asc",
      },
    });
  }
// Méthode pour compter le nombre total d'utilisateurs avec recherche
  async count(search?: string) {
    return prisma.utilisateur.count({
      where: search
        ? {
            OR: [
              {
                nom: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                prenom: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                login: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
    });
  }
// Méthode pour récupérer un utilisateur par son ID
  async findById(id: string) {
    return prisma.utilisateur.findUnique({
      where: {
        id,
      },
      include: {
        role: true,
      },
    });
  }

  async findByLogin(login: string) {
    return prisma.utilisateur.findUnique({
      where: {
        login,
      },
      include: {
        role: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.utilisateur.findUnique({
      where: {
        email,
      },
    });
  }

  async create(data: any) {
    return prisma.utilisateur.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.utilisateur.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: string) {
    return prisma.utilisateur.delete({
      where: {
        id,
      },
    });
  }
}