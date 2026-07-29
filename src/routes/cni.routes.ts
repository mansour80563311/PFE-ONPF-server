import { Router } from "express";

import { CniController } from "../controllers/cni.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

const cniController =
  new CniController();

router.post(
  "/verifier",
  authMiddleware,
  roleMiddleware(
    "ADMIN",
    "AGENT"
  ),
  (
    req,
    res,
    next
  ) => {
    void cniController
      .verifierIdentite(
        req,
        res,
        next
      );
  }
);

export default router;