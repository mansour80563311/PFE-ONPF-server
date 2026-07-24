import { Router } from "express";

import { JournalClotureController } from "../controllers/journal-cloture.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

const journalController =
  new JournalClotureController();

router.use(authMiddleware);

// Prévisualiser une clôture
router.get(
  "/preview",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE"
  ),
  journalController.preview.bind(
    journalController
  )
);

// Lister les journaux
router.get(
  "/",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE"
  ),
  journalController.findAll.bind(
    journalController
  )
);

// Consulter un journal
router.get(
  "/:id",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE"
  ),
  journalController.findById.bind(
    journalController
  )
);

// Créer une clôture
router.post(
  "/",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE"
  ),
  journalController.create.bind(
    journalController
  )
);

export default router;