import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { ReferentielService } from "../services/referentiel.service";
import { ApiResponse } from "../utils/ApiResponse";

export class ReferentielController {
  /**
   * GET /api/referentiels/gouvernorats
   *
   * Retourne la liste des gouvernorats actifs.
   */
  async getGouvernorats(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const gouvernorats =
        await ReferentielService.getGouvernorats();

      return res.json(
        ApiResponse.success(
          "Liste des gouvernorats récupérée.",
          gouvernorats
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/referentiels/operations-foncieres
   *
   * Retourne la liste des types
   * d'opérations foncières actifs.
   */
  async getOperationsFoncieres(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const operations =
        await ReferentielService.getOperationsFoncieres();

      return res.json(
        ApiResponse.success(
          "Liste des opérations foncières récupérée.",
          operations
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/referentiels/prestations
   *
   * Retourne la liste des prestations actives.
   */
  async getPrestations(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const prestations =
        await ReferentielService.getPrestations();

      return res.json(
        ApiResponse.success(
          "Liste des prestations récupérée.",
          prestations
        )
      );
    } catch (error) {
      next(error);
    }
  }
}