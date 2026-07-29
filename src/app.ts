import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";// Importation des routes des utilisateurs
import authRoutes from "./routes/auth.routes"; // Importation des routes d'authentification
import { errorMiddleware } from "./middlewares/error.middleware";
import roleRoutes from "./routes/role.route";
import demandeRoutes from "./routes/demande.routes";
import journalClotureRoutes from "./routes/journal-cloture.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import cniRoutes from "./routes/cni.routes"; 

const app = express();


// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Utilisation des routes
app.use("/api/auth", authRoutes); // Utilisation des routes d'authentification
app.use("/api/users", userRoutes); // Utilisation des routes des utilisateurs
app.use("/api/roles", roleRoutes); // Utilisation des routes des rôles
app.use("/api/demandes", demandeRoutes); // Utilisation des routes des demandes
app.use("/api/journaux-cloture",journalClotureRoutes);
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/cni",cniRoutes);

app.use(errorMiddleware);

// Route de test
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API is running successfully 🚀",
  });
});

export default app;