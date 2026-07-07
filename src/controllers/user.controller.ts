import { NextFunction, Request, Response } from "express";
import { UserService } from "../services/user.service";
import { ApiResponse } from "../utils/ApiResponse";
import {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
} from "../validations/user.validation";
type UserParams = {
  id: string;
};

export class UserController {
  private userService = new UserService();
// lister les utilisateurs 
  async findAll(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = listUsersSchema.parse(req.query);

    const result = await this.userService.findAll(query);

    return res.json(
      ApiResponse.success(
        "Liste des utilisateurs récupérée.",
        result.users,
        result.meta
      )
    );
  } catch (error) {
    next(error);
  }
}
// recuperer un utilisateur
async findById(
  req: Request<UserParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await this.userService.findById(req.params.id);

    return res.json(
      ApiResponse.success(
        "Utilisateur récupéré.",
        user
      )
    );
  } catch (error) {
    next(error);
  }
}
// créer un utilisateur
async create(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = createUserSchema.parse(req.body);

    const user = await this.userService.create(data);

    return res.status(201).json(
      ApiResponse.success(
        "Utilisateur créé avec succès.",
        user
      )
    );
  } catch (error) {
    next(error);
  }
}

// mettre à jour un utilisateur
async update(
  req: Request<UserParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await this.userService.update(
      req.params.id,
      data
    );

    return res.json(
      ApiResponse.success(
        "Utilisateur mis à jour.",
        user
      )
    );
  } catch (error) {
    next(error);
  }
}

// supprimer un utilisateur
async delete(
  req: Request<UserParams>,
  res: Response,
  next: NextFunction
) {
  try {
    await this.userService.delete(req.params.id);

    return res.json(
      ApiResponse.success(
        "Utilisateur supprimé."
      )
    );
  } catch (error) {
    next(error);
  }
}
}