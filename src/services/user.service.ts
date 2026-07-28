import bcrypt from "bcrypt";

import type {
  Prisma,
} from "@prisma/client";

import {
  AppError,
} from "../errors/AppError";

import {
  UserRepository,
} from "../repositories/user.repository";

import type {
  CreateUserDto,
  ListUsersDto,
  UpdateUserDto,
} from "../validations/user.validation";

export class UserService {
  private userRepository =
    new UserRepository();

  /*
   * Lister les utilisateurs avec
   * pagination et recherche.
   */
  async findAll(
    query: ListUsersDto
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const skip =
      (page - 1) * limit;

    const [
      users,
      total,
    ] = await Promise.all([
      this.userRepository.findAll(
        skip,
        limit,
        search
      ),

      this.userRepository.count(
        search
      ),
    ]);

    return {
      users,

      meta: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    };
  }

  /*
   * Récupérer un utilisateur par son ID.
   */
  async findById(
    id: string
  ) {
    const user =
      await this.userRepository
        .findById(id);

    if (!user) {
      throw new AppError(
        "Utilisateur introuvable.",
        404
      );
    }

    return user;
  }

  /*
   * Créer un utilisateur.
   */
  async create(
    data: CreateUserDto
  ) {
    const normalizedEmail =
      data.email
        .trim()
        .toLowerCase();

    const normalizedLogin =
      data.login.trim();

    const emailExists =
      await this.userRepository
        .findByEmail(
          normalizedEmail
        );

    if (emailExists) {
      throw new AppError(
        "Cet email est déjà utilisé.",
        409
      );
    }

    const loginExists =
      await this.userRepository
        .findByLogin(
          normalizedLogin
        );

    if (loginExists) {
      throw new AppError(
        "Ce login est déjà utilisé.",
        409
      );
    }

    const role =
      await this.userRepository
        .findRoleById(
          data.roleId
        );

    if (!role) {
      throw new AppError(
        "Rôle introuvable.",
        404
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        data.password,
        10
      );

    return this.userRepository.create({
      nom: data.nom,
      prenom: data.prenom,
      email: normalizedEmail,
      telephone:
        data.telephone || null,
      login: normalizedLogin,
      password: hashedPassword,
      statut:
        data.statut ?? true,

      role: {
        connect: {
          id: data.roleId,
        },
      },
    });
  }

  /*
   * Mettre à jour un utilisateur.
   */
  async update(
    id: string,
    data: UpdateUserDto
  ) {
    await this.findById(id);

    const {
      roleId,
      password,
      email,
      login,
      ...rest
    } = data;

    const updateData:
      Prisma.UtilisateurUpdateInput = {
        ...rest,
    };

    /*
     * Vérification de l’unicité du nouvel
     * email lorsqu’il est modifié.
     */
    if (email !== undefined) {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const emailExists =
        await this.userRepository
          .findByEmail(
            normalizedEmail
          );

      if (
        emailExists &&
        emailExists.id !== id
      ) {
        throw new AppError(
          "Cet email est déjà utilisé.",
          409
        );
      }

      updateData.email =
        normalizedEmail;
    }

    /*
     * Vérification de l’unicité du nouveau
     * login lorsqu’il est modifié.
     */
    if (login !== undefined) {
      const normalizedLogin =
        login.trim();

      const loginExists =
        await this.userRepository
          .findByLogin(
            normalizedLogin
          );

      if (
        loginExists &&
        loginExists.id !== id
      ) {
        throw new AppError(
          "Ce login est déjà utilisé.",
          409
        );
      }

      updateData.login =
        normalizedLogin;
    }

    /*
     * Le mot de passe est modifié uniquement
     * lorsqu’une nouvelle valeur est fournie.
     */
    if (password) {
      updateData.password =
        await bcrypt.hash(
          password,
          10
        );
    }

    /*
     * Modification du rôle uniquement si un
     * nouvel identifiant de rôle est fourni.
     */
    if (roleId) {
      const role =
        await this.userRepository
          .findRoleById(
            roleId
          );

      if (!role) {
        throw new AppError(
          "Rôle introuvable.",
          404
        );
      }

      updateData.role = {
        connect: {
          id: roleId,
        },
      };
    }

    return this.userRepository.update(
      id,
      updateData
    );
  }

  /*
   * Supprimer un utilisateur.
   */
/*
 * Supprimer un utilisateur.
 *
 * Un Administrateur ne peut pas supprimer
 * son propre compte.
 */
  async delete(
    id: string,
    currentUserId: string
  ) {
    if (id === currentUserId) {
      throw new AppError(
        "Vous ne pouvez pas supprimer votre propre compte.",
        403
      );
    }

    await this.findById(id);

    return this.userRepository.delete(
      id
    );
  }
}