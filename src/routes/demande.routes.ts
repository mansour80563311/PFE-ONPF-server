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
  PaiementComplementaireController,
} from "../controllers/paiement-complementaire.controller";

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

const paiementComplementaireController =
  new PaiementComplementaireController();

/*
 * Toutes les routes suivantes nécessitent
 * un utilisateur authentifié.
 */
router.use(authMiddleware);

/*
 * PAIEMENT D’UNE DEMANDE
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
 * PAIEMENT D'UN COMPLEMENT TARIFAIRE
 *
 * Le complément existe uniquement lorsqu'une
 * correction du Responsable Guichet a augmenté
 * le montant réglementaire de la demande.
 *
 * POST /api/demandes/:demandeId/paiement-complementaire
 *
 * Accès :
 * - Administrateur ;
 * - Caissier.
 *
 * Le service vérifie notamment :
 * - que le paiement initial est déjà PAYE ;
 * - qu'une révision COMPLEMENT_A_PAYER existe ;
 * - que le complément n'a pas déjà été encaissé ;
 * - que le montant remis couvre le complément.
 */
router.post(
  "/:demandeId/paiement-complementaire",
  roleMiddleware(
    "ADMIN",
    "CAISSIER"
  ),
  paiementComplementaireController
    .create.bind(
      paiementComplementaireController
    )
);

/*
 * Lecture de l'état de la dernière régularisation.
 *
 * Permet au Responsable et au Caissier de savoir si
 * le complément est encore à payer ou a déjà été réglé.
 */
router.get(
  "/:demandeId/paiement-complementaire",
  roleMiddleware(
    "ADMIN",
    "CAISSIER",
    "RESPONSABLE"
  ),
  paiementComplementaireController
    .findByDemandeId.bind(
      paiementComplementaireController
    )
);

/*
 * Reçu PDF du dernier complément effectivement encaissé.
 *
 * GET /api/demandes/:demandeId/paiement-complementaire/recu
 */
router.get(
  "/:demandeId/paiement-complementaire/recu",
  roleMiddleware(
    "ADMIN",
    "CAISSIER",
    "RESPONSABLE"
  ),
  paiementComplementaireController
    .generateRecu.bind(
      paiementComplementaireController
    )
);

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

router.get(
  "/:id/documents",
  demandeDocumentController.findAll.bind(
    demandeDocumentController
  )
);

router.get(
  "/:id/documents/:documentId/download",
  demandeDocumentController.download.bind(
    demandeDocumentController
  )
);

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

router.get(
  "/",
  demandeController.findAll.bind(
    demandeController
  )
);

router.get(
  "/:id/history",
  demandeController.findHistory.bind(
    demandeController
  )
);

/*
 * Récapitulatif imprimable avant paiement.
 *
 * Le backend vérifie :
 * - que l'utilisateur est ADMIN ou AGENT ;
 * - les droits d'accès à la demande ;
 * - que la demande est encore EN_ATTENTE ;
 * - que CIN/passeport, contrat et procuration
 *   sont présents.
 */
router.get(
  "/:id/recapitulatif",
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  demandeController
    .generateRecapitulatif.bind(
      demandeController
    )
);

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

/*
 * Correction métier effectuée pendant le contrôle
 * du Responsable Guichet, après le paiement initial.
 *
 * PATCH /api/demandes/:id/controle/correction
 *
 * Accès :
 * - Responsable Guichet ;
 * - Administrateur.
 *
 * Le service vérifie ensuite que :
 * - la demande est EN_COURS ;
 * - il s'agit d'une INSCRIPTION ;
 * - le paiement initial est PAYE ;
 * - la tarification initiale est FIGEE ;
 * - aucune autre révision n'attend déjà un complément.
 */
router.patch(
  "/:id/controle/correction",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE"
  ),
  demandeController
    .corrigerParResponsable.bind(
      demandeController
    )
);

router.get(
  "/:id",
  demandeController.findById.bind(
    demandeController
  )
);

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
