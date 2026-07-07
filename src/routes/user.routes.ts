import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();
const userController = new UserController();
// Protéger toutes les routes
router.use(authMiddleware);
// Routes de consultation
router.get(
  "/",
  userController.findAll.bind(userController)
);

router.get(
  "/:id",
  userController.findById.bind(userController)
);
// Crée un utilisateur (accessible uniquement aux administrateurs)
router.post(
  "/",
  roleMiddleware("ADMIN"),
  userController.create.bind(userController)
);

// Mettre à jour un utilisateur (accessible uniquement aux administrateurs)
router.put(
  "/:id",
  roleMiddleware("ADMIN"),
  userController.update.bind(userController)
);

// Supprimer un utilisateur (accessible uniquement aux administrateurs)
router.delete(
  "/:id",
  roleMiddleware("ADMIN"),
  userController.delete.bind(userController)
);

export default router;