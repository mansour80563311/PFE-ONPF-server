import { Router } from "express";

import { DashboardController } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

const dashboardController =
  new DashboardController();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(
    "ADMIN",
    "AGENT",
    "RESPONSABLE"
  ),
  dashboardController.getStats.bind(
    dashboardController
  )
);

export default router;