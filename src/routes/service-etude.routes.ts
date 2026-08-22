import { Router } from "express";

import {
  ServiceEtudeController,
} from "../controllers/service-etude.controller";

import {
  authMiddleware,
} from "../middlewares/auth.middleware";

import {
  roleMiddleware,
} from "../middlewares/role.middleware";

const router = Router();

const serviceEtudeController =
  new ServiceEtudeController();

router.use(authMiddleware);

/*
 * Liste des demandes d'INSCRIPTION :
 * - validées au guichet ;
 * - rattachées à une journée actuellement CLOTUREE ;
 * - clôturées avant aujourd'hui ;
 * - non encore distribuées ;
 * - possédant au moins une opération foncière.
 */
router.get(
  "/demandes-a-distribuer",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE_INSCRIPTIONS"
  ),
  serviceEtudeController
    .findDemandesADistribuer.bind(
      serviceEtudeController
    )
);

/*
 * Agents actifs pouvant être choisis pour
 * une affectation future.
 *
 * Exemple :
 * GET /api/etudes/agents-affectables?role=REDACTEUR
 */
router.get(
  "/agents-affectables",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE_INSCRIPTIONS"
  ),
  serviceEtudeController
    .findAgentsAffectables.bind(
      serviceEtudeController
    )
);


/*
 * Distribution manuelle d'une demande.
 *
 * POST /api/etudes/distributions
 *
 * Le backend crée atomiquement :
 * - 1 DossierEtude ;
 * - 3 AffectationEtude ;
 * - 1 EtudeOperation par opération.
 */
router.post(
  "/distributions",
  roleMiddleware(
    "ADMIN",
    "RESPONSABLE_INSCRIPTIONS"
  ),
  serviceEtudeController
    .distribuer.bind(
      serviceEtudeController
    )
);


/*
 * File personnelle du Rédacteur connecté.
 *
 * Seuls les dossiers pour lesquels il possède
 * l'affectation REDACTEUR active sont retournés.
 */
router.get(
  "/redacteur/dossiers",
  roleMiddleware(
    "REDACTEUR"
  ),
  serviceEtudeController
    .findDossiersRedacteur.bind(
      serviceEtudeController
    )
);


/*
 * Détail d'un dossier affecté au Rédacteur connecté.
 */
router.get(
  "/redacteur/dossiers/:dossierId",
  roleMiddleware(
    "REDACTEUR"
  ),
  serviceEtudeController
    .findDossierRedacteurById.bind(
      serviceEtudeController
    )
);


/*
 * Sauvegarde d'un avis du Rédacteur sans transmission.
 *
 * INSCRIPTION :
 * - avis ;
 * - minute logique ;
 * - nouvelle version de minute.
 *
 * REFUS :
 * - avis ;
 * - un ou plusieurs motifs de refus.
 */
router.post(
  "/redacteur/operations/:etudeOperationId/avis",
  roleMiddleware(
    "REDACTEUR"
  ),
  serviceEtudeController
    .enregistrerAvisRedacteur.bind(
      serviceEtudeController
    )
);


/*
 * Transmission du dernier travail sauvegardé par le
 * Rédacteur vers le Vérificateur.
 *
 * EN_REDACTION / A_CORRIGER_REDACTEUR
 *              ↓
 *       EN_VERIFICATION
 */
router.post(
  "/redacteur/operations/:etudeOperationId/transmettre",
  roleMiddleware(
    "REDACTEUR"
  ),
  serviceEtudeController
    .transmettreOperationRedacteur.bind(
      serviceEtudeController
    )
);


/*
 * File personnelle du Vérificateur connecté.
 *
 * Seuls les dossiers pour lesquels il possède
 * l'affectation VERIFICATEUR active sont retournés.
 */
router.get(
  "/verificateur/dossiers",
  roleMiddleware(
    "VERIFICATEUR"
  ),
  serviceEtudeController
    .findDossiersVerificateur.bind(
      serviceEtudeController
    )
);


/*
 * Détail d'un dossier affecté au Vérificateur
 * actuellement connecté.
 */
router.get(
  "/verificateur/dossiers/:dossierId",
  roleMiddleware(
    "VERIFICATEUR"
  ),
  serviceEtudeController
    .findDossierVerificateurById.bind(
      serviceEtudeController
    )
);


/*
 * Sauvegarde de l'avis du Vérificateur.
 *
 * Cette action ne transmet pas encore l'opération.
 * Elle permet d'abord de déterminer :
 * - concordance avec le Rédacteur ;
 * - ou divergence à traiter.
 */
router.post(
  "/verificateur/operations/:etudeOperationId/avis",
  roleMiddleware(
    "VERIFICATEUR"
  ),
  serviceEtudeController
    .enregistrerAvisVerificateur.bind(
      serviceEtudeController
    )
);


/*
 * Transmission au Super-vérificateur lorsque les derniers
 * avis Rédacteur/Vérificateur sont concordants.
 *
 * EN_VERIFICATION / A_CORRIGER_VERIFICATEUR
 *                  ↓
 *        EN_SUPER_VERIFICATION
 */
router.post(
  "/verificateur/operations/:etudeOperationId/transmettre-super",
  roleMiddleware(
    "VERIFICATEUR"
  ),
  serviceEtudeController
    .transmettreOperationVerificateurAuSuper.bind(
      serviceEtudeController
    )
);


/*
 * File personnelle du Super-vérificateur connecté.
 *
 * Seuls les dossiers pour lesquels il possède
 * l'affectation SUPER_VERIFICATEUR active sont retournés.
 */
router.get(
  "/super-verificateur/dossiers",
  roleMiddleware(
    "SUPER_VERIFICATEUR"
  ),
  serviceEtudeController
    .findDossiersSuperVerificateur.bind(
      serviceEtudeController
    )
);


router.get(
  "/super-verificateur/dossiers/:dossierId",
  roleMiddleware("SUPER_VERIFICATEUR"),
  serviceEtudeController
    .findDossierSuperVerificateurById.bind(
      serviceEtudeController
    )
);


/*
 * Sauvegarde de l'avis du Super-vérificateur.
 *
 * L'opération reste EN_SUPER_VERIFICATION :
 * aucune décision finale n'est encore enregistrée ici.
 */
router.post(
  "/super-verificateur/operations/:etudeOperationId/avis",
  roleMiddleware(
    "SUPER_VERIFICATEUR"
  ),
  serviceEtudeController
    .enregistrerAvisSuperVerificateur.bind(
      serviceEtudeController
    )
);


/*
 * Modification versionnée de la minute par le
 * Super-vérificateur.
 *
 * L'opération reste EN_SUPER_VERIFICATION et
 * versionFinaleId reste nul jusqu'à la finalisation.
 */
router.post(
  "/super-verificateur/operations/:etudeOperationId/minute",
  roleMiddleware(
    "SUPER_VERIFICATEUR"
  ),
  serviceEtudeController
    .modifierMinuteSuperVerificateur.bind(
      serviceEtudeController
    )
);

export default router;
