import {
  StatutDemande,
  StatutDocument,
} from "@prisma/client";

import prisma from "../config/prisma";

export class DashboardRepository {
  async getStats() {
    const [
      totalDemandes,
      demandesEnAttente,
      demandesEnCours,
      demandesValidees,
      demandesRejetees,
      demandesCloturees,
      documentsNonConformes,
      dernieresDemandes,
      derniersJournaux,
    ] = await prisma.$transaction([
      prisma.demande.count(),

      prisma.demande.count({
        where: {
          statut: StatutDemande.EN_ATTENTE,
        },
      }),

      prisma.demande.count({
        where: {
          statut: StatutDemande.EN_COURS,
        },
      }),

      prisma.demande.count({
        where: {
          statut: StatutDemande.VALIDEE,
        },
      }),

      prisma.demande.count({
        where: {
          statut: StatutDemande.REJETEE,
        },
      }),

      prisma.demande.count({
        where: {
          journalClotureId: {
            not: null,
          },
        },
      }),

      prisma.demandeDocument.count({
        where: {
          statut:
            StatutDocument.NON_CONFORME,
        },
      }),

      prisma.demande.findMany({
        take: 5,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          numero: true,
          nomDemandeur: true,
          prenomDemandeur: true,
          cin: true,
          referenceFonciere: true,
          statut: true,
          createdAt: true,
        },
      }),

      prisma.journalCloture.findMany({
        take: 5,

        orderBy: {
          dateCloture: "desc",
        },

        select: {
          id: true,
          numero: true,
          dateJour: true,
          dateCloture: true,

          responsable: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              login: true,
            },
          },

          _count: {
            select: {
              demandes: true,
            },
          },
        },
      }),
    ]);

    return {
      statistiques: {
        totalDemandes,
        demandesEnAttente,
        demandesEnCours,
        demandesValidees,
        demandesRejetees,
        demandesCloturees,
        documentsNonConformes,
      },

      dernieresDemandes,
      derniersJournaux,
    };
  }
}