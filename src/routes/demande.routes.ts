import { Router } from "express";

import { DemandeController } from "../controllers/demande.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

import { DemandeDocumentController } from "../controllers/demande-document.controller";

import {
  uploadDemandeDocument,
} from "../config/upload";

const router = Router();

const demandeController =
  new DemandeController();

const demandeDocumentController =
  new DemandeDocumentController();

router.use(authMiddleware);

// Ajouter une pièce justificative
router.post(
  "/:id/documents",
  roleMiddleware("ADMIN", "AGENT"),
  uploadDemandeDocument.single("document"),
  demandeDocumentController.upload.bind(
    demandeDocumentController
  )
);

// Lister les pièces justificatives
router.get(
  "/:id/documents",
  demandeDocumentController.findAll.bind(
    demandeDocumentController
  )
);

// Télécharger un document
router.get(
  "/:id/documents/:documentId/download",
  demandeDocumentController.download.bind(
    demandeDocumentController
  )
);

// Supprimer un document
router.delete(
  "/:id/documents/:documentId",
  roleMiddleware("ADMIN", "AGENT"),
  demandeDocumentController.delete.bind(
    demandeDocumentController
  )
);

// Vérifier la conformité d’une pièce
router.patch(
  "/:id/documents/:documentId/status",
  roleMiddleware("ADMIN", "AGENT"),
  demandeDocumentController.updateStatus.bind(
    demandeDocumentController
  )
);

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