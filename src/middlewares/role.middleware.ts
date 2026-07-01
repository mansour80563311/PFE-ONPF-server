import { NextFunction, Request, Response } from "express";

export const roleMiddleware = (...roles: string[]) => {

    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Non authentifié."
            });
        }

        if (!roles.includes(req.user.role)) {

            return res.status(403).json({
                message: "Accès refusé."
            });

        }

        next();

    };

};