import {
  Router,
} from "express";

import {
  JournalCaisseController,
} from "../controllers/journal-caisse.controller";

import {
  authMiddleware,
} from "../middlewares/auth.middleware";

import {
  roleMiddleware,
} from "../middlewares/role.middleware";

const router =
  Router();

const journalCaisseController =
  new JournalCaisseController();

/*
 * Toutes les routes nécessitent
 * une authentification.
 */
router.use(
  authMiddleware
);

/*
 * Liste des journaux.
 *
 * CAISSIER :
 * uniquement ses journaux.
 *
 * ADMIN et RESPONSABLE :
 * tous les journaux.
 */
router.get(
  "/",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE",
    "CAISSIER"
  ),
  journalCaisseController
    .findAll
    .bind(
      journalCaisseController
    )
);

/*
 * Journal du jour.
 *
 * Cette route doit être déclarée avant
 * la route générique /:id.
 */
router.get(
  "/du-jour",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE",
    "CAISSIER"
  ),
  journalCaisseController
    .findJournalDuJour
    .bind(
      journalCaisseController
    )
);

/*
 * Clôturer un journal.
 *
 * Le Responsable ne possède pas
 * cette autorisation.
 */
router.patch(
  "/:id/cloturer",
  roleMiddleware(
    "ADMIN",
    "CAISSIER"
  ),
  journalCaisseController
    .close
    .bind(
      journalCaisseController
    )
);

/*
 * Détail d’un journal.
 */
router.get(
  "/:id",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE",
    "CAISSIER"
  ),
  journalCaisseController
    .findById
    .bind(
      journalCaisseController
    )
);

export default router;