import { Router } from "express";

import { JournalClotureController } from "../controllers/journal-cloture.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

const journalController =
  new JournalClotureController();

router.use(authMiddleware);

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

router.patch(
  "/:id/decloture",
  roleMiddleware("ADMIN"),
  journalController.decloture.bind(
    journalController
  )
);

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