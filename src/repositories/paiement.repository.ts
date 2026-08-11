import {
  StatutTarification,
} from "@prisma/client";

import type {
  Prisma,
} from "@prisma/client";

import prisma from "../config/prisma";


/**
 * Informations retournées avec un paiement.
 *
 * Les anciens champs sont temporairement
 * conservés pour assurer la compatibilité
 * avec le reçu et les anciennes demandes.
 *
 * Les nouvelles informations métier sont
 * également retournées :
 *
 * - nature ;
 * - titre foncier ;
 * - opérations ;
 * - prestation ;
 * - tarification détaillée.
 */
const paiementInclude = {
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
      /**
       * Agent ayant créé la demande.
       */
      utilisateur: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          login: true,
        },
      },

      /**
       * Nouveau titre foncier.
       */
      titreFoncier: {
        include: {
          gouvernorat: true,
        },
      },

      /**
       * Opérations d'une inscription.
       */
      operationsFoncieres: {
        include: {
          typeOperationFonciere:
            true,
        },

        orderBy: {
          createdAt:
            "asc" as const,
        },
      },

      /**
       * Prestation éventuelle.
       */
      prestation: true,

      /**
       * Snapshot réglementaire
       * utilisé pour le paiement.
       */
      tarification: {
        include: {
          lignes: {
            orderBy: {
              ordre:
                "asc" as const,
            },
          },
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
} satisfies Prisma.PaiementInclude;


export class PaiementRepository {
  /**
   * ========================================================
   * RECHERCHE PAR DEMANDE
   * ========================================================
   *
   * demandeId est unique dans Paiement :
   * une demande ne peut avoir qu'un seul
   * paiement.
   */
  async findByDemandeId(
    demandeId: string
  ) {
    return prisma.paiement.findUnique({
      where: {
        demandeId,
      },

      include:
        paiementInclude,
    });
  }


  /**
   * ========================================================
   * RECHERCHE PAR ID
   * ========================================================
   */
  async findById(
    id: string
  ) {
    return prisma.paiement.findUnique({
      where: {
        id,
      },

      include:
        paiementInclude,
    });
  }


  /**
   * ========================================================
   * DERNIER NUMERO DE RECU
   * ========================================================
   *
   * Exemple :
   *
   * REC-2026-000001
   */
  async findLastNumeroRecu(
    year: number
  ) {
    return prisma.paiement.findFirst({
      where: {
        numeroRecu: {
          startsWith:
            `REC-${year}-`,
        },
      },

      orderBy: {
        numeroRecu:
          "desc",
      },

      select: {
        numeroRecu: true,
      },
    });
  }


  /**
   * ========================================================
   * CREATION SIMPLE
   * ========================================================
   *
   * Conservée temporairement pour
   * compatibilité éventuelle avec d'autres
   * modules.
   */
  async create(
    data:
      Prisma.PaiementCreateInput
  ) {
    return prisma.paiement.create({
      data,

      include:
        paiementInclude,
    });
  }


  /**
   * ========================================================
   * CREATION DU PAIEMENT + FIGEAGE TARIFAIRE
   * ========================================================
   *
   * Ces deux écritures sont réalisées
   * dans la même transaction.
   *
   * Si la création du paiement échoue,
   * le figage de la tarification est annulé.
   *
   * Si le figage échoue,
   * le paiement n'est pas enregistré.
   */
  async createAndFreezeTarification(
    params: {
      data:
        Prisma.PaiementCreateInput;

      tarificationId:
        string | null;

      dateFigeage:
        Date;
    }
  ) {
    const {
      data,
      tarificationId,
      dateFigeage,
    } = params;


    return prisma.$transaction(
      async (tx) => {
        /**
         * Pour une nouvelle demande,
         * le snapshot tarifaire devient
         * définitif au moment du paiement.
         *
         * Les anciennes demandes peuvent ne
         * pas posséder de TarificationDemande.
         */
        if (tarificationId) {
          await tx
            .tarificationDemande
            .update({
              where: {
                id:
                  tarificationId,
              },

              data: {
                statut:
                  StatutTarification
                    .FIGEE,

                dateFigeage,
              },
            });
        }


        /**
         * Création du paiement dans la
         * même transaction.
         */
        return tx.paiement.create({
          data,

          include:
            paiementInclude,
        });
      }
    );
  }
}