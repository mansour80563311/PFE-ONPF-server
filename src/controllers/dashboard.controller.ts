import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { DashboardService } from "../services/dashboard.service";
import { ApiResponse } from "../utils/ApiResponse";

export class DashboardController {
  private dashboardService =
    new DashboardService();

  async getStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const dashboard =
        await this.dashboardService.getStats();

      return res.json(
        ApiResponse.success(
          "Statistiques du tableau de bord récupérées.",
          dashboard
        )
      );
    } catch (error) {
      next(error);
    }
  }
}