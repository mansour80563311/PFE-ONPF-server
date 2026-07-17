import { Request, Response } from "express";
import { RoleService } from "../services/role.service";
import { ApiResponse } from "../utils/ApiResponse";

export class RoleController {

  constructor(
    private service = new RoleService()
  ) {}

  async findAll(
    req: Request,
    res: Response
  ) {

    const roles = await this.service.findAll();

    return res.json(
      ApiResponse.success(
        "Liste des rôles récupérée.",
        roles
      )
    );

  }

}