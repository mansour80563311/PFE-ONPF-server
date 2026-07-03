import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { loginSchema } from "../validations/auth.validation";
import { ApiResponse } from "../utils/ApiResponse";

const authService = new AuthService();

export class AuthController {
  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = loginSchema.parse(req.body);

      const result = await authService.login(
        data.login,
        data.password
      );

      return res.status(200).json(
        ApiResponse.success("Connexion réussie.", result)
      );
    } catch (error) {
      next(error);
    }
  }

  // Déconnexion de l'utilisateur   
  async logout(req: Request, res: Response) {
    return res.status(200).json(
      ApiResponse.success("Déconnexion réussie.", undefined)
    );
  }

    async me(       
        req: Request,
        res: Response,
        next: NextFunction
) {
  try {
    const user = await authService.me(req.user!.userId);

    return res.json(
        ApiResponse.success(
        "Utilisateur récupéré.",
    user
  )
);  
  } catch (error) {
    next(error);
  }
}
}