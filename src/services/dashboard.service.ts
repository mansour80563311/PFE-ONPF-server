import {
  StatutDemande,
} from "@prisma/client";

import type {
  Prisma,
} from "@prisma/client";

import {
  AppError,
} from "../errors/AppError";

import {
  DashboardRepository,
} from "../repositories/dashboard.repository";

export class DashboardService {
  private dashboardRepository =
    new DashboardRepository();

  private buildDemandeAccessFilter(
    utilisateurId: string,
    role: string
  ): Prisma.DemandeWhereInput {
    /*
     * L’Administrateur accède à toutes
     * les demandes.
     */
    if (role === "ADMIN") {
      return {};
    }

    /*
     * L’Agent accède uniquement aux
     * demandes qu’il a créées.
     */
    if (role === "AGENT") {
      return {
        utilisateurId,
      };
    }

    /*
     * Le Responsable voit les demandes
     * transmises ou finalisées, mais jamais
     * les demandes EN_ATTENTE.
     */
    if (role === "RESPONSABLE") {
      return {
        statut: {
          in: [
            StatutDemande.EN_COURS,
            StatutDemande.VALIDEE,
            StatutDemande.REJETEE,
          ],
        },
      };
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à consulter le tableau de bord.",
      403
    );
  }

  async getStats(
    utilisateurId: string,
    role: string
  ) {
    const demandeAccessFilter =
      this.buildDemandeAccessFilter(
        utilisateurId,
        role
      );

    const includeJournaux =
      role === "ADMIN" ||
      role === "RESPONSABLE";

    return this.dashboardRepository
      .getStats(
        demandeAccessFilter,
        includeJournaux
      );
  }
}