import {
  Prisma,
} from "@prisma/client";

import prisma from "../config/prisma";

/*
 * Sélection publique utilisée dans les
 * réponses de l’API.
 *
 * Le champ password est volontairement
 * absent.
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

export class UserRepository {
  /*
   * Construction du filtre de recherche.
   *
   * Une recherche constituée uniquement
   * d’espaces est considérée comme vide.
   */
  private buildSearchFilter(
    search?: string
  ): Prisma.UtilisateurWhereInput {
    const normalizedSearch =
      search?.trim();

    if (!normalizedSearch) {
      return {};
    }

    return {
      OR: [
        {
          nom: {
            contains:
              normalizedSearch,

            mode: "insensitive",
          },
        },

        {
          prenom: {
            contains:
              normalizedSearch,

            mode: "insensitive",
          },
        },

        {
          login: {
            contains:
              normalizedSearch,

            mode: "insensitive",
          },
        },

        {
          email: {
            contains:
              normalizedSearch,

            mode: "insensitive",
          },
        },
      ],
    };
  }

  /*
   * Récupérer les utilisateurs avec
   * pagination et recherche.
   */
  async findAll(
    skip: number,
    take: number,
    search?: string
  ) {
    return prisma.utilisateur.findMany({
      where:
        this.buildSearchFilter(
          search
        ),

      skip,
      take,

      orderBy: {
        nom: "asc",
      },

      select:
        utilisateurPublicSelect,
    });
  }

  /*
   * Compter les utilisateurs selon le
   * même filtre de recherche.
   */
  async count(
    search?: string
  ) {
    return prisma.utilisateur.count({
      where:
        this.buildSearchFilter(
          search
        ),
    });
  }

  /*
   * Récupérer un utilisateur par son ID.
   *
   * Le mot de passe n’est jamais retourné.
   */
  async findById(
    id: string
  ) {
    return prisma.utilisateur.findUnique({
      where: {
        id,
      },

      select:
        utilisateurPublicSelect,
    });
  }

  /*
   * Récupérer un utilisateur par son login.
   *
   * Cette méthode est utilisée par
   * l’authentification. Elle doit donc
   * récupérer le hash du mot de passe pour
   * permettre la comparaison avec bcrypt.
   *
   * Elle ne doit pas être utilisée
   * directement dans une réponse HTTP.
   */
  async findByLogin(
    login: string
  ) {
    return prisma.utilisateur.findUnique({
      where: {
        login,
      },

      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        login: true,
        password: true,
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
      },
    });
  }

  /*
   * Vérifier si un email existe.
   */
  async findByEmail(
    email: string
  ) {
    return prisma.utilisateur.findUnique({
      where: {
        email,
      },

      select: {
        id: true,
        email: true,
      },
    });
  }

  /*
   * Vérifier l’existence d’un rôle.
   */
  async findRoleById(
    id: string
  ) {
    return prisma.role.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        nom: true,
      },
    });
  }

  /*
   * Retourne uniquement les comptes actifs
   * possédant le rôle métier demandé.
   *
   * Utilisé par le Responsable des inscriptions
   * pour préparer la distribution d'un dossier.
   */
  async findActiveByRoleName(
    roleName: string
  ) {
    return prisma.utilisateur.findMany({
      where: {
        statut: true,

        role: {
          is: {
            nom:
              roleName,
          },
        },
      },

      orderBy: [
        {
          nom: "asc",
        },
        {
          prenom: "asc",
        },
      ],

      select:
        utilisateurPublicSelect,
    });
  }

  /*
   * Créer un utilisateur.
   *
   * Le mot de passe est stocké en base,
   * mais n’est pas renvoyé dans la réponse.
   */
  async create(
    data:
      Prisma.UtilisateurCreateInput
  ) {
    return prisma.utilisateur.create({
      data,

      select:
        utilisateurPublicSelect,
    });
  }

  /*
   * Mettre à jour un utilisateur.
   *
   * Le mot de passe n’est pas renvoyé.
   */
  async update(
    id: string,
    data:
      Prisma.UtilisateurUpdateInput
  ) {
    return prisma.utilisateur.update({
      where: {
        id,
      },

      data,

      select:
        utilisateurPublicSelect,
    });
  }

  /*
   * Supprimer un utilisateur.
   */
  async delete(
    id: string
  ) {
    return prisma.utilisateur.delete({
      where: {
        id,
      },

      select: {
        id: true,
        nom: true,
        prenom: true,
        login: true,
      },
    });
  }
}
