/* 
Pourquoi faire autant de méthodes ?

Parce que dans le UserService, nous ne voulons jamais écrire 
directement du Prisma.

  */
import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

export class UserRepository {
// methde privée
private buildSearchFilter(search?: string): Prisma.UtilisateurWhereInput {

    if (!search) return {};

    return {

        OR: [

            {
                nom: {
                    contains: search,
                    mode: "insensitive"
                }
            },

            {
                prenom: {
                    contains: search,
                    mode: "insensitive"
                }
            },

            {
                login: {
                    contains: search,
                    mode: "insensitive"
                }
            },

            {
                email: {
                    contains: search,
                    mode: "insensitive"
                }
            }

        ]

    };

}   

    // Méthode pour récupérer tous les utilisateurs avec pagination et recherche
  async findAll(skip: number, take: number, search?: string) {
    return prisma.utilisateur.findMany({
      where: this.buildSearchFilter(search),
  
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
    where: this.buildSearchFilter(search),
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
// Méthode pour récupérer un utilisateur par son login
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
// Méthode pour récupérer un utilisateur par son email
  async findByEmail(email: string) {
    return prisma.utilisateur.findUnique({
      where: {
        email,
      },
    });
  }
// Méthode pour créer un nouvel utilisateur
    async create(data: Prisma.UtilisateurCreateInput) {
        return prisma.utilisateur.create({
        data
    });
}
// Méthode pour mettre à jour un utilisateur existant
  async update(id: string, data: Prisma.UtilisateurUpdateInput) {
    return prisma.utilisateur.update({
        where: {
        id,
      },
      data,
    });
  }
// Méthode pour supprimer un utilisateur
  async delete(id: string) {
    return prisma.utilisateur.delete({
      where: {
        id,
      },
    });
  }
}