import { Router } from "express";

import { ReferentielController } from "../controllers/referentiel.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

const referentielController =
  new ReferentielController();

/**
 * Tous les référentiels sont réservés
 * aux utilisateurs authentifiés.
 *
 * Aucun rôle particulier n'est imposé :
 * ADMIN, AGENT, RESPONSABLE et CAISSIER
 * peuvent consulter les référentiels
 * nécessaires à leurs interfaces.
 */
router.use(authMiddleware);

/**
 * Liste des gouvernorats.
 *
 * GET /api/referentiels/gouvernorats
 */
router.get(
  "/gouvernorats",
  referentielController.getGouvernorats.bind(
    referentielController
  )
);

/**
 * Liste des opérations foncières.
 *
 * GET /api/referentiels/operations-foncieres
 */
router.get(
  "/operations-foncieres",
  referentielController.getOperationsFoncieres.bind(
    referentielController
  )
);

/**
 * Liste des prestations.
 *
 * GET /api/referentiels/prestations
 */
router.get(
  "/prestations",
  referentielController.getPrestations.bind(
    referentielController
  )
);

export default router;