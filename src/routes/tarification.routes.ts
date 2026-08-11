import { Router } from "express";

import { TarificationController } from "../controllers/tarification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

const tarificationController =
  new TarificationController();

/**
 * Le calcul tarifaire nécessite
 * une authentification.
 *
 * Aucun rôle particulier n'est imposé
 * pour l'instant puisque plusieurs profils
 * auront besoin de consulter le montant.
 */
router.use(authMiddleware);

/**
 * Calcul d'une tarification.
 *
 * POST /api/tarification/calculer
 */
router.post(
  "/calculer",
  tarificationController.calculer.bind(
    tarificationController
  )
);

export default router;