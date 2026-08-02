import { Router } from "express";

import {
  PaiementController,
} from "../controllers/paiement.controller";

import {
  authMiddleware,
} from "../middlewares/auth.middleware";

import {
  roleMiddleware,
} from "../middlewares/role.middleware";

const router = Router();

const paiementController =
  new PaiementController();

/*
 * Toutes les routes nécessitent
 * une authentification.
 */
router.use(authMiddleware);

/*
 * Consulter directement un paiement
 * à partir de son identifiant.
 *
 * GET /api/paiements/:id
 *
 * Accès :
 * - Administrateur ;
 * - Caissier.
 */
router.get(
  "/:id",
  roleMiddleware(
    "ADMIN",
    "CAISSIER"
  ),
  paiementController.findById.bind(
    paiementController
  )
);

export default router;