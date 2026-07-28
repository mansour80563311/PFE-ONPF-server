import {
  Router,
} from "express";

import {
  UserController,
} from "../controllers/user.controller";

import {
  authMiddleware,
} from "../middlewares/auth.middleware";

import {
  roleMiddleware,
} from "../middlewares/role.middleware";

const router = Router();

const userController =
  new UserController();

/*
 * Toutes les routes de gestion des
 * utilisateurs nécessitent une
 * authentification.
 */
router.use(authMiddleware);

/*
 * La gestion des utilisateurs est
 * exclusivement réservée à
 * l’Administrateur.
 */
router.use(
  roleMiddleware("ADMIN")
);

/*
 * Liste des utilisateurs.
 */
router.get(
  "/",
  userController.findAll.bind(
    userController
  )
);

/*
 * Consultation d’un utilisateur.
 */
router.get(
  "/:id",
  userController.findById.bind(
    userController
  )
);

/*
 * Création d’un utilisateur.
 */
router.post(
  "/",
  userController.create.bind(
    userController
  )
);

/*
 * Mise à jour d’un utilisateur.
 */
router.put(
  "/:id",
  userController.update.bind(
    userController
  )
);

/*
 * Suppression d’un utilisateur.
 */
router.delete(
  "/:id",
  userController.delete.bind(
    userController
  )
);

export default router;