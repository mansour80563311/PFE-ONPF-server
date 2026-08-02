import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  PaiementService,
} from "../services/paiement.service";

import {
  ApiResponse,
} from "../utils/ApiResponse";

import {
  createPaiementSchema,
} from "../validations/paiement.validation";

const paiementService =
  new PaiementService();

export class PaiementController {
  /**
   * Enregistre le paiement d’une demande.
   *
   * Route prévue :
   * POST /api/demandes/:demandeId/paiement
   */
  async create(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponse.error(
            "Non authentifié."
          )
        );
      }

      const demandeId =
        String(
          req.params.demandeId
        );

      const data =
        createPaiementSchema.parse(
          req.body
        );

      const paiement =
        await paiementService.create(
          demandeId,
          data,
          req.user.userId,
          req.user.role
        );

      return res.status(201).json(
        ApiResponse.success(
          "Paiement enregistré avec succès.",
          paiement
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Consulte le paiement associé
   * à une demande.
   *
   * Route prévue :
   * GET /api/demandes/:demandeId/paiement
   */
  async findByDemandeId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponse.error(
            "Non authentifié."
          )
        );
      }

      const demandeId =
        String(
          req.params.demandeId
        );

      const paiement =
        await paiementService
          .findByDemandeId(
            demandeId,
            req.user.userId,
            req.user.role
          );

      return res.status(200).json(
        ApiResponse.success(
          "Paiement récupéré avec succès.",
          paiement
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Consulte directement un paiement
   * à partir de son identifiant.
   *
   * Cette route sera réservée au
   * Caissier et à l’Administrateur.
   *
   * Route prévue :
   * GET /api/paiements/:id
   */
  async findById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponse.error(
            "Non authentifié."
          )
        );
      }

      const paiementId =
        String(
          req.params.id
        );

      const paiement =
        await paiementService
          .findById(
            paiementId,
            req.user.role
          );

      return res.status(200).json(
        ApiResponse.success(
          "Paiement récupéré avec succès.",
          paiement
        )
      );
    } catch (error) {
      next(error);
    }
  }
}