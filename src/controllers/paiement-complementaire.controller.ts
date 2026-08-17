import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  PaiementComplementaireService,
} from "../services/paiement-complementaire.service";

import {
  ApiResponse,
} from "../utils/ApiResponse";

import {
  createPaiementSchema,
} from "../validations/paiement.validation";

export class PaiementComplementaireController {
  private paiementComplementaireService =
    new PaiementComplementaireService();

  /**
   * Enregistre le complément tarifaire d'une
   * demande déjà payée initialement.
   *
   * POST /api/demandes/:demandeId/paiement-complementaire
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

      const result =
        await this
          .paiementComplementaireService
          .create(
            demandeId,
            data,
            req.user.userId,
            req.user.role
          );

      return res.status(201).json(
        ApiResponse.success(
          "Complément de paiement enregistré avec succès.",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retourne l'état de la dernière régularisation
   * tarifaire d'une demande.
   *
   * GET /api/demandes/:demandeId/paiement-complementaire
   */
  async findByDemandeId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const demandeId =
        String(
          req.params.demandeId
        );

      const result =
        await this
          .paiementComplementaireService
          .findEtatByDemandeId(
            demandeId
          );

      return res.json(
        ApiResponse.success(
          "État de la régularisation récupéré.",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Génère le reçu PDF du dernier complément encaissé.
   *
   * GET /api/demandes/:demandeId/paiement-complementaire/recu
   */
  async generateRecu(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const demandeId =
        String(
          req.params.demandeId
        );

      const {
        buffer,
        numeroRecu,
      } =
        await this
          .paiementComplementaireService
          .generateRecuByDemandeId(
            demandeId
          );

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${numeroRecu}.pdf"`
      );

      res.setHeader(
        "Content-Length",
        buffer.length.toString()
      );

      return res.send(
        buffer
      );
    } catch (error) {
      next(error);
    }
  }

}
