import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Token manquant."
    });
  }

  const token = authHeader.split(" ")[1];

  try {

    req.user = verifyToken(token);

    next();

  } catch {

    return res.status(401).json({
      message: "Token invalide."
    });

  }

};