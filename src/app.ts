import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roleRoutes from "./routes/role.route";
import demandeRoutes from "./routes/demande.routes";
import paiementRoutes from "./routes/paiement.routes";
import journalClotureRoutes from "./routes/journal-cloture.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import cniRoutes from "./routes/cni.routes";
import journalCaisseRoutes from "./routes/journal-caisse.routes";

import {
  errorMiddleware,
} from "./middlewares/error.middleware";

const app = express();

/*
 * Middlewares globaux
 */
app.use(cors());

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/*
 * Route de vérification de l’API
 */
app.get(
  "/api/health",
  (_req, res) => {
    return res.status(200).json({
      status: "OK",
      message:
        "API is running successfully 🚀",
    });
  }
);

/*
 * Routes de l’application
 */
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/roles",
  roleRoutes
);

app.use(
  "/api/demandes",
  demandeRoutes
);

app.use(
  "/api/paiements",
  paiementRoutes
);

app.use(
  "/api/journaux-caisse",
  journalCaisseRoutes
);

app.use(
  "/api/journaux-cloture",
  journalClotureRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/cni",
  cniRoutes
);


/*
 * Le middleware global d’erreur doit rester
 * après toutes les routes.
 */
app.use(
  errorMiddleware
);

export default app;