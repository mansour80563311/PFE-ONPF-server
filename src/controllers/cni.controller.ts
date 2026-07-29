import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { CniService } from "../services/cni.service";
import { ApiResponse } from "../utils/ApiResponse";
import { verifierCniSchema } from "../validations/cni.validation";

const cniService = new CniService();

export class CniController {
  async verifierIdentite(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { cin } =
        verifierCniSchema.parse(
          req.body
        );

      const identite =
        await cniService.verifierIdentite(
          cin
        );

      if (!identite) {
        return res
          .status(404)
          .json(
            ApiResponse.error(
              "Aucune identité trouvée pour ce numéro CIN."
            )
          );
      }

      return res
        .status(200)
        .json(
          ApiResponse.success(
            "Identité vérifiée avec succès.",
            {
              cin: identite.cin,
              nom: identite.nom,
              prenom:
                identite.prenom,
              dateNaissance:
                identite.dateNaissance
                  .toISOString()
                  .slice(0, 10),
              adresse:
                identite.adresse,
              referenceVerification:
                identite.referenceVerification,
              identiteValide: true,
              source:
                "SERVICE_CNI_SIMULE",
            }
          )
        );
    } catch (error) {
      next(error);
    }
  }
}