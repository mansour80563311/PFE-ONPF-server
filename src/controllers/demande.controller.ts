import {
  NextFunction,
  Request,
  Response,
} from "express";

import { DemandeService } from "../services/demande.service";
import { ApiResponse } from "../utils/ApiResponse";

import {
  createDemandeSchema,
  updateDemandeSchema,
  listDemandesSchema,
  updateDemandeStatusSchema,
} from "../validations/demande.validation";

type DemandeParams = {
  id: string;
};

export class DemandeController {
  private demandeService = new DemandeService();

  async findAll(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query = listDemandesSchema.parse(
        req.query
      );

      const result =
        await this.demandeService.findAll(query);

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

  async findById(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const demande =
        await this.demandeService.findById(
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

  async create(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = createDemandeSchema.parse(
        req.body
      );

      const demande =
        await this.demandeService.create({
          ...data,
          utilisateurId: req.user!.userId,
        });

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

  async update(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = updateDemandeSchema.parse(
        req.body
      );

      const demande =
        await this.demandeService.update(
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

  async updateStatus(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        updateDemandeStatusSchema.parse(
          req.body
        );

      const demande =
      await this.demandeService.updateStatus(
        req.params.id,
        data.statut,
        
        req.user!.userId,
        data.motifRejet
      );
      return res.json(
        ApiResponse.success(
          "Statut de la demande mis à jour avec succès.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      await this.demandeService.delete(
        req.params.id
      );

      return res.json(
        ApiResponse.success(
          "Demande supprimée."
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findHistory(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const historique =
        await this.demandeService.findHistory(
          req.params.id
        );

      return res.json(
        ApiResponse.success(
          "Historique de la demande récupéré.",
          historique
        )
      );
    } catch (error) {
      next(error);
    }
  }


}