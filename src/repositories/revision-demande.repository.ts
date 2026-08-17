import {
  Prisma,
  StatutRevisionDemande,
  TypeLigneTarification,
} from "@prisma/client";

import prisma from "../config/prisma";

const revisionInclude = {
  responsable: {
    select: {
      id: true,
      nom: true,
      prenom: true,
      login: true,
    },
  },

  lignes: {
    orderBy: {
      ordre: "asc" as const,
    },
  },

  paiementComplementaire: {
    select: {
      id: true,
      numeroRecu: true,
      statut: true,
      montantExigible: true,
      montantEncaisse: true,
      datePaiement: true,
    },
  },
} satisfies Prisma.RevisionDemandeInclude;

export class RevisionDemandeRepository {
  /**
   * Dernière révision enregistrée pour la demande.
   */
  async findLatestByDemandeId(
    demandeId: string
  ) {
    return prisma.revisionDemande.findFirst({
      where: {
        demandeId,
      },

      orderBy: {
        numeroRevision:
          "desc",
      },

      include:
        revisionInclude,
    });
  }

  /**
   * Recherche un complément encore en attente.
   *
   * Dans cette première version, une nouvelle correction
   * n'est pas ouverte tant qu'une précédente révision
   * tarifaire attend encore son complément de paiement.
   * Cela évite d'empiler plusieurs soldes concurrents.
   */
  async findPendingComplementByDemandeId(
    demandeId: string
  ) {
    return prisma.revisionDemande.findFirst({
      where: {
        demandeId,

        statut:
          StatutRevisionDemande
            .COMPLEMENT_A_PAYER,
      },

      orderBy: {
        numeroRevision:
          "desc",
      },

      include:
        revisionInclude,
    });
  }

  /**
   * Applique la correction de la demande et crée
   * la révision dans une seule transaction.
   *
   * Le snapshot TarificationDemande initial n'est
   * volontairement jamais modifié ici.
   */
  async createInscriptionRevisionAndApplyCorrection(
    params: {
      demandeId: string;
      responsableId: string;

      numeroTitreFoncier: string;
      gouvernoratId: string;
      gouvernoratCode: string;

      operationFonciereIds: string[];
      replaceOperations: boolean;

      donneesAvant:
        Prisma.InputJsonValue;
      donneesApres:
        Prisma.InputJsonValue;

      motif: string | null;

      montantAvant:
        Prisma.Decimal;
      montantApres:
        Prisma.Decimal;
      complementDu:
        Prisma.Decimal;

      referenceReglementaire:
        string | null;

      statut:
        StatutRevisionDemande;

      lignes: Array<{
        type:
          TypeLigneTarification;
        code: string | null;
        libelle: string;
        quantite: number;
        montantUnitaire:
          Prisma.Decimal;
        montant:
          Prisma.Decimal;
        ordre: number;
      }>;
    }
  ) {
    return prisma.$transaction(
      async (tx) => {
        /*
         * Sécurité transactionnelle : on revérifie qu'aucun
         * complément n'est apparu entre la lecture du service
         * et l'écriture finale.
         */
        const pendingRevision =
          await tx.revisionDemande
            .findFirst({
              where: {
                demandeId:
                  params.demandeId,

                statut:
                  StatutRevisionDemande
                    .COMPLEMENT_A_PAYER,
              },

              select: {
                id: true,
                numeroRevision:
                  true,
              },
            });

        if (pendingRevision) {
          throw new Error(
            "PENDING_COMPLEMENT"
          );
        }

        const latestRevision =
          await tx.revisionDemande
            .findFirst({
              where: {
                demandeId:
                  params.demandeId,
              },

              orderBy: {
                numeroRevision:
                  "desc",
              },

              select: {
                numeroRevision:
                  true,
              },
            });

        const numeroRevision =
          (
            latestRevision
              ?.numeroRevision ??
            0
          ) + 1;

        /*
         * Le titre est identifié par le couple
         * numéro + gouvernorat.
         */
        const titreFoncier =
          await tx.titreFoncier
            .upsert({
              where: {
                numero_gouvernoratId:
                  {
                    numero:
                      params
                        .numeroTitreFoncier,

                    gouvernoratId:
                      params
                        .gouvernoratId,
                  },
              },

              update: {},

              create: {
                numero:
                  params
                    .numeroTitreFoncier,

                gouvernoratId:
                  params
                    .gouvernoratId,
              },
            });

        if (
          params.replaceOperations
        ) {
          await tx
            .demandeOperationFonciere
            .deleteMany({
              where: {
                demandeId:
                  params.demandeId,
              },
            });

          await tx
            .demandeOperationFonciere
            .createMany({
              data:
                params
                  .operationFonciereIds
                  .map(
                    (
                      typeOperationFonciereId
                    ) => ({
                      demandeId:
                        params
                          .demandeId,

                      typeOperationFonciereId,
                    })
                  ),

              skipDuplicates:
                true,
            });
        }

        /*
         * Mise à jour uniquement des données métier.
         * montantTotal et tarification NE SONT PAS écrasés :
         * ils conservent la photographie du paiement initial.
         */
        await tx.demande.update({
          where: {
            id:
              params.demandeId,
          },

          data: {
            titreFoncierId:
              titreFoncier.id,

            referenceFonciere:
              `${params.numeroTitreFoncier}/${params.gouvernoratCode}`,
          },
        });

        const revision =
          await tx.revisionDemande
            .create({
              data: {
                demandeId:
                  params.demandeId,

                responsableId:
                  params.responsableId,

                numeroRevision,

                donneesAvant:
                  params.donneesAvant,

                donneesApres:
                  params.donneesApres,

                motif:
                  params.motif,

                montantAvant:
                  params.montantAvant,

                montantApres:
                  params.montantApres,

                complementDu:
                  params.complementDu,

                referenceReglementaire:
                  params
                    .referenceReglementaire,

                statut:
                  params.statut,

                lignes: {
                  create:
                    params.lignes,
                },
              },

              include:
                revisionInclude,
            });

        const demande =
          await tx.demande
            .findUnique({
              where: {
                id:
                  params.demandeId,
              },

              include: {
                utilisateur: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    login: true,
                  },
                },

                paiement: {
                  select: {
                    id: true,
                    numeroRecu: true,
                    statut: true,
                    montantExigible:
                      true,
                    montantEncaisse:
                      true,
                    datePaiement:
                      true,
                  },
                },

                titreFoncier: {
                  include: {
                    gouvernorat:
                      true,
                  },
                },

                operationsFoncieres: {
                  include: {
                    typeOperationFonciere:
                      true,
                  },

                  orderBy: {
                    createdAt:
                      "asc",
                  },
                },

                prestation:
                  true,

                tarification: {
                  include: {
                    lignes: {
                      orderBy: {
                        ordre:
                          "asc",
                      },
                    },
                  },
                },
              },
            });

        return {
          demande,
          revision,
        };
      }
    );
  }
}
