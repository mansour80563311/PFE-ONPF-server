import { DashboardRepository } from "../repositories/dashboard.repository";

export class DashboardService {
  private dashboardRepository =
    new DashboardRepository();

  async getStats() {
    return this.dashboardRepository.getStats();
  }
}