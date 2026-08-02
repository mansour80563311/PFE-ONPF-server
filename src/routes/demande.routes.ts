import { Router } from "express";

import {
  DemandeController,
} from "../controllers/demande.controller";

import {
  DemandeDocumentController,
} from "../controllers/demande-document.controller";

import {
  PaiementController,
} from "../controllers/paiement.controller";

import {
  authMiddleware,
} from "../middlewares/auth.middleware";

import {
  roleMiddleware,
} from "../middlewares/role.middleware";

import {
  uploadDemandeDocument,
} from "../config/upload";

const router = Router();

const demandeController =
  new DemandeController();

const demandeDocumentController =
  new DemandeDocumentController();

const paiementController =
  new PaiementController();

/*
 * Toutes les routes suivantes nécessitent
 * un utilisateur authentifié.
 */
router.use(authMiddleware);

/*
 * PAIEMENT D’UNE DEMANDE
 */

/*
 * Enregistrer le paiement total
 * d’une demande.
 *
 * POST /api/demandes/:demandeId/paiement
 *
 * Accès :
 * - Administrateur ;
 * - Caissier.
 */
router.post(
  "/:demandeId/paiement",
  roleMiddleware(
    "ADMIN",
    "CAISSIER"
  ),
  paiementController.create.bind(
    paiementController
  )
);

/*
 * Consulter le paiement associé
 * à une demande.
 *
 * GET /api/demandes/:demandeId/paiement
 *
 * Le service vérifie ensuite les droits :
 * - l’Administrateur voit tous les paiements ;
 * - le Caissier voit les paiements ;
 * - l’Agent voit uniquement ceux de ses demandes ;
 * - le Responsable voit ceux des demandes transmises.
 */
router.get(
  "/:demandeId/paiement",
  roleMiddleware(
    "ADMIN",
    "CAISSIER",
    "AGENT",
    "RESPONSABLE"
  ),
  paiementController.findByDemandeId.bind(
    paiementController
  )
);

/*
 * DOCUMENTS
 */

// Ajouter une pièce justificative :
// Administrateur ou Agent uniquement
router.post(
  "/:id/documents",
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  uploadDemandeDocument.single(
    "document"
  ),
  demandeDocumentController.upload.bind(
    demandeDocumentController
  )
);

// Lister les pièces justificatives :
// tous les utilisateurs authentifiés
router.get(
  "/:id/documents",
  demandeDocumentController.findAll.bind(
    demandeDocumentController
  )
);

// Télécharger un document :
// tous les utilisateurs authentifiés
router.get(
  "/:id/documents/:documentId/download",
  demandeDocumentController.download.bind(
    demandeDocumentController
  )
);

// Supprimer un document :
// Administrateur ou Agent uniquement
router.delete(
  "/:id/documents/:documentId",
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  demandeDocumentController.delete.bind(
    demandeDocumentController
  )
);

// Vérifier la conformité d’une pièce :
// Administrateur ou Responsable uniquement
router.patch(
  "/:id/documents/:documentId/status",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE"
  ),
  demandeDocumentController.updateStatus.bind(
    demandeDocumentController
  )
);

/*
 * DEMANDES
 */

// Liste des demandes
router.get(
  "/",
  demandeController.findAll.bind(
    demandeController
  )
);

// Historique d’une demande
router.get(
  "/:id/history",
  demandeController.findHistory.bind(
    demandeController
  )
);

// Création d’une demande
router.post(
  "/",
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  demandeController.create.bind(
    demandeController
  )
);

// Vérifier ou régulariser l’identité CNI :
// Administrateur ou Agent propriétaire
router.patch(
  "/:id/verifier-cni",
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  demandeController.verifierCni.bind(
    demandeController
  )
);

// Mise à jour du statut
router.patch(
  "/:id/status",
  roleMiddleware(
    "ADMIN",
    "AGENT",
    "RESPONSABLE"
  ),
  demandeController.updateStatus.bind(
    demandeController
  )
);

// Consulter une demande
router.get(
  "/:id",
  demandeController.findById.bind(
    demandeController
  )
);

// Modifier une demande
router.put(
  "/:id",
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  demandeController.update.bind(
    demandeController
  )
);

// Supprimer une demande
router.delete(
  "/:id",
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  demandeController.delete.bind(
    demandeController
  )
);

export default router;