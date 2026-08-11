import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { TarificationService } from "../services/tarification.service";
import { calculTarificationSchema } from "../validations/tarification.validation";
import { ApiResponse } from "../utils/ApiResponse";

export class TarificationController {
  /**
   * Calcule une estimation tarifaire
   * sans enregistrer de paiement.
   *
   * POST /api/tarification/calculer
   */
  async calculer(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        calculTarificationSchema.parse(
          req.body
        );

      const resultat =
        await TarificationService.calculer(
          data
        );

      return res.json(
        ApiResponse.success(
          "Tarification calculée avec succès.",
          resultat
        )
      );
    } catch (error) {
      next(error);
    }
  }
}