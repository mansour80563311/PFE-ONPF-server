import {
  Prisma,
  StatutRevisionDemande,
} from "@prisma/client";

import prisma from "../config/prisma";

const paiementComplementaireInclude = {
  caissier: {
    select: {
      id: true,
      nom: true,
      prenom: true,
      login: true,

      role: {
        select: {
          id: true,
          nom: true,
        },
      },
    },
  },

  demande: {
    include: {
      utilisateur: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          login: true,
        },
      },

      titreFoncier: {
        include: {
          gouvernorat: true,
        },
      },

      operationsFoncieres: {
        include: {
          typeOperationFonciere: true,
        },

        orderBy: {
          createdAt: "asc" as const,
        },
      },

      prestation: true,

      tarification: {
        include: {
          lignes: {
            orderBy: {
              ordre: "asc" as const,
            },
          },
        },
      },
    },
  },

  revision: {
    include: {
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
    },
  },

  journalCaisse: {
    select: {
      id: true,
      numero: true,
      dateJour: true,
      statut: true,
    },
  },
} satisfies Prisma.PaiementComplementaireInclude;

export class PaiementComplementaireRepository {
  /**
   * Recherche le paiement complémentaire d'une révision.
   */
  async findByRevisionId(
    revisionId: string
  ) {
    return prisma.paiementComplementaire
      .findUnique({
        where: {
          revisionId,
        },

        include:
          paiementComplementaireInclude,
      });
  }

  /**
   * Recherche le dernier complément encaissé
   * pour une demande.
   */
  async findLatestByDemandeId(
    demandeId: string
  ) {
    return prisma.paiementComplementaire
      .findFirst({
        where: {
          demandeId,
        },

        orderBy: {
          datePaiement: "desc",
        },

        include:
          paiementComplementaireInclude,
      });
  }

  /**
   * Dernier numéro de reçu complémentaire.
   *
   * Exemple :
   * REC-COMP-2026-000001
   *
   * Un préfixe distinct évite toute collision
   * avec les reçus du paiement initial.
   */
  async findLastNumeroRecu(
    year: number
  ) {
    return prisma.paiementComplementaire
      .findFirst({
        where: {
          numeroRecu: {
            startsWith:
              `REC-COMP-${year}-`,
          },
        },

        orderBy: {
          numeroRecu: "desc",
        },

        select: {
          numeroRecu: true,
        },
      });
  }

  /**
   * Crée le paiement complémentaire et marque
   * la révision comme COMPLEMENT_PAYE dans une
   * seule transaction.
   */
  async createAndMarkRevisionPaid(
    params: {
      revisionId: string;
      data:
        Prisma.PaiementComplementaireCreateInput;
    }
  ) {
    return prisma.$transaction(
      async (tx) => {
        const revision =
          await tx.revisionDemande
            .findUnique({
              where: {
                id:
                  params.revisionId,
              },

              select: {
                id: true,
                statut: true,
                complementDu: true,

                paiementComplementaire: {
                  select: {
                    id: true,
                  },
                },
              },
            });

        if (!revision) {
          throw new Error(
            "REVISION_NOT_FOUND"
          );
        }

        if (
          revision.statut !==
          StatutRevisionDemande
            .COMPLEMENT_A_PAYER
        ) {
          throw new Error(
            "REVISION_NOT_PENDING"
          );
        }

        if (
          revision
            .paiementComplementaire
        ) {
          throw new Error(
            "COMPLEMENT_ALREADY_PAID"
          );
        }

        const paiement =
          await tx
            .paiementComplementaire
            .create({
              data:
                params.data,
            });

        await tx.revisionDemande
          .update({
            where: {
              id:
                params.revisionId,
            },

            data: {
              statut:
                StatutRevisionDemande
                  .COMPLEMENT_PAYE,
            },
          });

        /*
         * On relit le paiement après la mise à jour
         * de la révision afin que l'objet retourné
         * contienne bien revision.statut =
         * COMPLEMENT_PAYE partout dans la réponse API.
         */
        const paiementActualise =
          await tx
            .paiementComplementaire
            .findUnique({
              where: {
                id: paiement.id,
              },

              include:
                paiementComplementaireInclude,
            });

        if (!paiementActualise) {
          throw new Error(
            "COMPLEMENT_NOT_FOUND_AFTER_CREATE"
          );
        }

        return paiementActualise;
      }
    );
  }
}
