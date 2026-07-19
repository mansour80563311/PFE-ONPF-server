import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";

import { ApiResponse } from "../utils/ApiResponse";
import { Prisma } from "@prisma/client";

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Erreurs métier
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(
    ApiResponse.error(error.message)
);
  }
  // je ne conseille pas d'utiliser ApiResponse.error, car les erreurs de validation ont besoin du tableau errors. Gardons cette structure.
  // Erreurs Zod
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Erreur de validation.",
      errors: error.issues,
    });
  }
  if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json(
        ApiResponse.error("Cette ressource existe déjà.")
      );
    }

  console.error(error);

    return res.status(500).json(
     ApiResponse.error("Erreur interne du serveur.")
    );
};