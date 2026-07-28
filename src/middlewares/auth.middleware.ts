import type {
  NextFunction,
  Request,
  Response,
} from "express";

import prisma from "../config/prisma";

import {
  verifyToken,
} from "../utils/jwt";

import {
  ApiResponse,
} from "../utils/ApiResponse";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return res.status(401).json(
      ApiResponse.error(
        "Token manquant."
      )
    );
  }

  const token =
    authHeader.substring(7).trim();

  if (!token) {
    return res.status(401).json(
      ApiResponse.error(
        "Token manquant."
      )
    );
  }

  try {
    /*
     * Le JWT permet uniquement d’identifier
     * l’utilisateur.
     *
     * Le rôle contenu dans le token n’est
     * volontairement pas utilisé pour les
     * autorisations.
     */
    const payload =
      verifyToken(token);

    /*
     * Récupération des informations actuelles
     * de l’utilisateur depuis PostgreSQL.
     */
    const utilisateur =
      await prisma.utilisateur.findUnique({
        where: {
          id: payload.userId,
        },

        select: {
          id: true,
          statut: true,

          role: {
            select: {
              nom: true,
            },
          },
        },
      });

    /*
     * Le compte a pu être supprimé après
     * l’émission du token.
     */
    if (!utilisateur) {
      return res.status(401).json(
        ApiResponse.error(
          "Utilisateur introuvable ou supprimé."
        )
      );
    }

    /*
     * Le compte a pu être désactivé après
     * l’émission du token.
     */
    if (!utilisateur.statut) {
      return res.status(403).json(
        ApiResponse.error(
          "Utilisateur désactivé."
        )
      );
    }

    /*
     * req.user reçoit le rôle actuel venant
     * de la base de données.
     */
    req.user = {
      userId: utilisateur.id,
      role: utilisateur.role.nom,
    };

    next();
  } catch (error) {
    console.error(
      "Erreur authentification :",
      error
    );

    return res.status(401).json(
      ApiResponse.error(
        "Token invalide ou expiré."
      )
    );
  }
};