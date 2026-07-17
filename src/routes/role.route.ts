import { Router } from "express";
import { RoleController } from "../controllers/role.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

const controller = new RoleController();

// Toutes les routes sont protégées
router.use(authMiddleware);

router.get(
  "/",
  controller.findAll.bind(controller)
);

export default router;