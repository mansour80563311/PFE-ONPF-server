import { Router } from "express";

import { DemandeController } from "../controllers/demande.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

const demandeController =
  new DemandeController();

router.use(authMiddleware);

// Liste des demandes
router.get(
  "/",
  demandeController.findAll.bind(
    demandeController
  )
);

// Historique d'une demande
router.get(
  "/:id/history",
  demandeController.findHistory.bind(
    demandeController
  )
);

// Création
router.post(
  "/",
  roleMiddleware("ADMIN", "AGENT"),
  demandeController.create.bind(
    demandeController
  )
);

// Mise à jour du statut
router.patch(
  "/:id/status",
  roleMiddleware("ADMIN", "AGENT"),
  demandeController.updateStatus.bind(
    demandeController
  )
);

// Une demande
router.get(
  "/:id",
  demandeController.findById.bind(
    demandeController
  )
);

// Modification
router.put(
  "/:id",
  roleMiddleware("ADMIN", "AGENT"),
  demandeController.update.bind(
    demandeController
  )
);

// Suppression
router.delete(
  "/:id",
  roleMiddleware("ADMIN"),
  demandeController.delete.bind(
    demandeController
  )
);


export default router;