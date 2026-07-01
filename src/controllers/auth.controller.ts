import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { loginSchema } from "../validations/auth.validation";

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);

      const result = await authService.login(
        data.login,
        data.password
      );

      return res.status(200).json(result);

    } catch (error: any) {
      return res.status(401).json({
        message: error.message,
      });
    }
  }
}