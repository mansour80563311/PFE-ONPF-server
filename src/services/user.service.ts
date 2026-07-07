import bcrypt from "bcrypt";
import { AppError } from "../errors/AppError";
import { UserRepository } from "../repositories/user.repository";
import {
  CreateUserDto,
  UpdateUserDto,
  ListUsersDto,
} from "../validations/user.validation";
import { Prisma } from "@prisma/client";

export class UserService {
  private userRepository = new UserRepository();

  // lister les utilisateurs 
    async findAll(query: ListUsersDto) {

    const page = query.page;
    const limit = query.limit;
    const search = query.search;

    const skip = (page - 1) * limit;

    const users = await this.userRepository.findAll(
      skip,
      limit,
      search
    );

    const total = await this.userRepository.count(search);

    return {
      users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  // rechercher un utilisateur
    async findById(id: string) {

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return user;
  }

  //créer un utilisateur
    async create(data: CreateUserDto) {

    const emailExists =
      await this.userRepository.findByEmail(data.email);

    if (emailExists) {
      throw new AppError(
        "Cet email est déjà utilisé.",
        409
      );
    }

    const loginExists =
      await this.userRepository.findByLogin(data.login);

    if (loginExists) {
      throw new AppError(
        "Ce login est déjà utilisé.",
        409
      );
    }

    const hashedPassword =
      await bcrypt.hash(data.password, 10);

    return this.userRepository.create({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone,
      login: data.login,
      password: hashedPassword,
      statut: data.statut ?? true,
      role: {
        connect: {
          id: data.roleId,
        },
      },
    });
  }

    // mettre à jour un utilisateur
async update(
  id: string,
  data: UpdateUserDto
) {
  await this.findById(id);

  const { roleId, ...rest } = data;

  const updateData: Prisma.UtilisateurUpdateInput = {
    ...rest,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  if (roleId) {
    updateData.role = {
      connect: {
        id: roleId,
      },
    };
  }

  return this.userRepository.update(id, updateData);
}
    // supprimer un utilisateur
    async delete(id: string) {

    await this.findById(id);

    return this.userRepository.delete(id);

  }
}
