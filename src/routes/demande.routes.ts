import { Router } from "express";
import { DemandeController } from "../controllers/demande.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();
const demandeController = new DemandeController();

// Toutes les routes sont protégées
router.use(authMiddleware);

// Liste des demandes
router.get(
  "/",
  demandeController.findAll.bind(demandeController)
);

// Une demande
router.get(
  "/:id",
  demandeController.findById.bind(demandeController)
);

// Création
router.post(
  "/",
  roleMiddleware("ADMIN", "AGENT"),
  demandeController.create.bind(demandeController)
);

// Modification
router.put(
  "/:id",
  roleMiddleware("ADMIN", "AGENT"),
  demandeController.update.bind(demandeController)
);

// Suppression
router.delete(
  "/:id",
  roleMiddleware("ADMIN"),
  demandeController.delete.bind(demandeController)
);

export default router;