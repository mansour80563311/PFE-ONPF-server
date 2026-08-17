import {
  Prisma,
  StatutJournalCaisse,
  StatutPaiement,
} from "@prisma/client";

import prisma from "../config/prisma";

/*
 * Informations publiques du Caissier.
 */
const caissierPublicSelect = {
  id: true,
  nom: true,
  prenom: true,
  login: true,
  email: true,
  statut: true,

  role: {
    select: {
      id: true,
      nom: true,
    },
  },
} satisfies Prisma.UtilisateurSelect;

/*
 * Paiement initial affiché dans le journal.
 */
const paiementJournalSelect = {
  id: true,
  numeroRecu: true,

  montantExigible: true,
  montantRemis: true,
  monnaieRendue: true,
  montantEncaisse: true,

  modePaiement: true,
  statut: true,
  datePaiement: true,
  observations: true,

  demande: {
    select: {
      id: true,
      numero: true,
      nomDemandeur: true,
      prenomDemandeur: true,
      cin: true,
      referenceFonciere: true,
    },
  },
} satisfies Prisma.PaiementSelect;

/*
 * Paiement complémentaire affiché dans le journal.
 */
const paiementComplementaireJournalSelect = {
  id: true,
  numeroRecu: true,

  montantExigible: true,
  montantRemis: true,
  monnaieRendue: true,
  montantEncaisse: true,

  modePaiement: true,
  statut: true,
  datePaiement: true,
  observations: true,

  demande: {
    select: {
      id: true,
      numero: true,
      nomDemandeur: true,
      prenomDemandeur: true,
      cin: true,
      referenceFonciere: true,
    },
  },

  revision: {
    select: {
      id: true,
      numeroRevision: true,
      montantAvant: true,
      montantApres: true,
      complementDu: true,
      statut: true,
    },
  },
} satisfies Prisma.PaiementComplementaireSelect;

export class JournalCaisseRepository {
  /**
   * Recherche le journal d’un Caissier
   * pour une journée précise.
   */
  async findByCaissierAndDate(
    caissierId: string,
    dateJour: Date
  ) {
    return prisma.journalCaisse.findUnique({
      where: {
        caissierId_dateJour: {
          caissierId,
          dateJour,
        },
      },

      include: {
        caissier: {
          select:
            caissierPublicSelect,
        },

        _count: {
          select: {
            paiements: true,
            paiementsComplementaires:
              true,
          },
        },
      },
    });
  }

  /**
   * Recherche le dernier numéro de journal
   * créé pour une année.
   */
  async findLastNumero(
    year: number
  ) {
    return prisma.journalCaisse.findFirst({
      where: {
        numero: {
          startsWith:
            `JC-${year}-`,
        },
      },

      orderBy: {
        numero:
          "desc",
      },

      select: {
        numero: true,
      },
    });
  }

  /**
   * Crée un nouveau journal de caisse.
   */
  async create(
    data:
      Prisma.JournalCaisseCreateInput
  ) {
    return prisma.journalCaisse.create({
      data,

      include: {
        caissier: {
          select:
            caissierPublicSelect,
        },

        _count: {
          select: {
            paiements: true,
            paiementsComplementaires:
              true,
          },
        },
      },
    });
  }

  /**
   * Recherche un journal avec tous
   * ses encaissements : paiements initiaux
   * et compléments.
   */
  async findById(
    id: string
  ) {
    return prisma.journalCaisse.findUnique({
      where: {
        id,
      },

      include: {
        caissier: {
          select:
            caissierPublicSelect,
        },

        paiements: {
          select:
            paiementJournalSelect,

          orderBy: {
            datePaiement:
              "asc",
          },
        },

        paiementsComplementaires: {
          select:
            paiementComplementaireJournalSelect,

          orderBy: {
            datePaiement:
              "asc",
          },
        },

        _count: {
          select: {
            paiements: true,
            paiementsComplementaires:
              true,
          },
        },
      },
    });
  }

  /**
   * Liste paginée des journaux.
   */
  async findAll(
    page: number,
    limit: number,
    accessFilter:
      Prisma.JournalCaisseWhereInput = {}
  ) {
    const skip =
      (page - 1) * limit;

    const [
      data,
      total,
    ] = await Promise.all([
      prisma.journalCaisse.findMany({
        where:
          accessFilter,

        skip,
        take:
          limit,

        orderBy: [
          {
            dateJour:
              "desc",
          },

          {
            createdAt:
              "desc",
          },
        ],

        include: {
          caissier: {
            select:
              caissierPublicSelect,
          },

          _count: {
            select: {
              paiements: true,
              paiementsComplementaires:
                true,
            },
          },
        },
      }),

      prisma.journalCaisse.count({
        where:
          accessFilter,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,

      totalPages:
        Math.ceil(
          total / limit
        ),
    };
  }

  /**
   * Calcule les totaux financiers du journal.
   *
   * Les encaissements initiaux ET les compléments
   * au statut PAYE sont comptabilisés.
   */
  async getTotals(
    journalCaisseId: string
  ) {
    const [
      initialAggregate,
      initialCount,
      complementAggregate,
      complementCount,
    ] = await Promise.all([
      prisma.paiement.aggregate({
        where: {
          journalCaisseId,

          statut:
            StatutPaiement.PAYE,
        },

        _sum: {
          montantExigible:
            true,

          montantRemis:
            true,

          monnaieRendue:
            true,

          montantEncaisse:
            true,
        },
      }),

      prisma.paiement.count({
        where: {
          journalCaisseId,

          statut:
            StatutPaiement.PAYE,
        },
      }),

      prisma.paiementComplementaire
        .aggregate({
          where: {
            journalCaisseId,

            statut:
              StatutPaiement.PAYE,
          },

          _sum: {
            montantExigible:
              true,

            montantRemis:
              true,

            monnaieRendue:
              true,

            montantEncaisse:
              true,
          },
        }),

      prisma.paiementComplementaire
        .count({
          where: {
            journalCaisseId,

            statut:
              StatutPaiement.PAYE,
          },
        }),
    ]);

    const zero =
      new Prisma.Decimal(0);

    const initialExigible =
      initialAggregate
        ._sum
        .montantExigible ??
      zero;

    const complementExigible =
      complementAggregate
        ._sum
        .montantExigible ??
      zero;

    const initialRemis =
      initialAggregate
        ._sum
        .montantRemis ??
      zero;

    const complementRemis =
      complementAggregate
        ._sum
        .montantRemis ??
      zero;

    const initialMonnaie =
      initialAggregate
        ._sum
        .monnaieRendue ??
      zero;

    const complementMonnaie =
      complementAggregate
        ._sum
        .monnaieRendue ??
      zero;

    const initialEncaisse =
      initialAggregate
        ._sum
        .montantEncaisse ??
      zero;

    const complementEncaisse =
      complementAggregate
        ._sum
        .montantEncaisse ??
      zero;

    return {
      nombrePaiementsInitiaux:
        initialCount,

      nombrePaiementsComplementaires:
        complementCount,

      nombrePaiements:
        initialCount +
        complementCount,

      montantTotalExigible:
        initialExigible.plus(
          complementExigible
        ),

      montantTotalRemis:
        initialRemis.plus(
          complementRemis
        ),

      monnaieTotaleRendue:
        initialMonnaie.plus(
          complementMonnaie
        ),

      montantTotalEncaisse:
        initialEncaisse.plus(
          complementEncaisse
        ),
    };
  }

  /**
   * Clôture définitivement un journal.
   */
  async close(
    id: string,
    observations?:
      string | null
  ) {
    return prisma.journalCaisse.update({
      where: {
        id,
      },

      data: {
        statut:
          StatutJournalCaisse.CLOTURE,

        dateCloture:
          new Date(),

        observations:
          observations ?? null,
      },

      include: {
        caissier: {
          select:
            caissierPublicSelect,
        },

        _count: {
          select: {
            paiements: true,
            paiementsComplementaires:
              true,
          },
        },
      },
    });
  }
}
