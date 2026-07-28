import {
  StatutDemande,
  StatutDocument,
} from "@prisma/client";

import type {
  Prisma,
} from "@prisma/client";

import prisma from "../config/prisma";

export class DashboardRepository {
  async getStats(
    demandeAccessFilter:
      Prisma.DemandeWhereInput,
    includeJournaux: boolean
  ) {
    const [
      totalDemandes,
      demandesEnAttente,
      demandesEnCours,
      demandesValidees,
      demandesRejetees,
      demandesCloturees,
      documentsNonConformes,
      dernieresDemandes,
    ] = await prisma.$transaction([
      /*
       * Nombre total de demandes accessibles
       * par l’utilisateur connecté.
       */
      prisma.demande.count({
        where: demandeAccessFilter,
      }),

      prisma.demande.count({
        where: {
          AND: [
            demandeAccessFilter,
            {
              statut:
                StatutDemande.EN_ATTENTE,
            },
          ],
        },
      }),

      prisma.demande.count({
        where: {
          AND: [
            demandeAccessFilter,
            {
              statut:
                StatutDemande.EN_COURS,
            },
          ],
        },
      }),

      prisma.demande.count({
        where: {
          AND: [
            demandeAccessFilter,
            {
              statut:
                StatutDemande.VALIDEE,
            },
          ],
        },
      }),

      prisma.demande.count({
        where: {
          AND: [
            demandeAccessFilter,
            {
              statut:
                StatutDemande.REJETEE,
            },
          ],
        },
      }),

      prisma.demande.count({
        where: {
          AND: [
            demandeAccessFilter,
            {
              journalClotureId: {
                not: null,
              },
            },
          ],
        },
      }),

      /*
       * Les documents non conformes sont
       * filtrés à travers leur demande.
       */
      prisma.demandeDocument.count({
        where: {
          statut:
            StatutDocument.NON_CONFORME,

          demande: {
            is: demandeAccessFilter,
          },
        },
      }),

      prisma.demande.findMany({
        where: demandeAccessFilter,

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
    ]);

    /*
     * Les Agents ne doivent pas recevoir
     * les journaux, même s’ils manipulent
     * directement l’API.
     */
    const derniersJournaux =
      includeJournaux
        ? await prisma.journalCloture
            .findMany({
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
            })
        : [];

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