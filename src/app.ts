import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";// Importation des routes des utilisateurs
import authRoutes from "./routes/auth.routes"; // Importation des routes d'authentification
import { errorMiddleware } from "./middlewares/error.middleware";
import roleRoutes from "./routes/role.route";
const app = express();


// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Utilisation des routes
app.use("/api/auth", authRoutes); // Utilisation des routes d'authentification
app.use("/api/users", userRoutes); // Utilisation des routes des utilisateurs
app.use("/api/roles", roleRoutes); // Utilisation des routes des rôles

app.use(errorMiddleware);

// Route de test
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API is running successfully 🚀",
  });
});

export default app;