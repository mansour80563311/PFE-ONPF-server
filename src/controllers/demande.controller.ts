import { NextFunction, Request, Response } from "express";
import { DemandeService } from "../services/demande.service";
import { ApiResponse } from "../utils/ApiResponse";
import {
  createDemandeSchema,
  updateDemandeSchema,
  listDemandesSchema,
} from "../validations/demande.validation";

type DemandeParams = {
  id: string;
};

export class DemandeController {
  private demandeService = new DemandeService();

  // Lister les demandes
    async findAll(
    req: Request,
    res: Response,
    next: NextFunction
    ) {
    try {
        const query = listDemandesSchema.parse(req.query);

        const result = await this.demandeService.findAll(query);

        return res.json(
        ApiResponse.success(
            "Liste des demandes récupérée.",
            result.demandes,
            result.meta
        )
        );
    } catch (error) {
        next(error);
    }
    }

  // Récupérer une demande
  async findById(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const demande = await this.demandeService.findById(
        req.params.id
      );

      return res.json(
        ApiResponse.success(
          "Demande récupérée.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Créer une demande
  async create(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = createDemandeSchema.parse(req.body);

      const demande = await this.demandeService.create(data);

      return res.status(201).json(
        ApiResponse.success(
          "Demande créée avec succès.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Modifier une demande
  async update(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = updateDemandeSchema.parse(req.body);

      const demande = await this.demandeService.update(
        req.params.id,
        data
      );

      return res.json(
        ApiResponse.success(
          "Demande mise à jour.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Supprimer une demande
  async delete(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      await this.demandeService.delete(req.params.id);

      return res.json(
        ApiResponse.success(
          "Demande supprimée."
        )
      );
    } catch (error) {
      next(error);
    }
  }
}