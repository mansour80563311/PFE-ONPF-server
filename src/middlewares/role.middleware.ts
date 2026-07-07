import { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";

export const roleMiddleware = (...roles: string[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    if (!req.user) {
      return res.status(401).json(
        ApiResponse.error("Non authentifié.")
      );
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        ApiResponse.error("Accès refusé.")
      );
    }

    next();
  };
};