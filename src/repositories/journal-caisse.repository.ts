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
 * Informations d’un paiement affichées
 * dans le détail du journal de caisse.
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
          },
        },
      },
    });
  }

  /**
   * Recherche le dernier numéro de journal
   * créé pour une année.
   *
   * Exemple :
   * JC-2026-000001
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
          },
        },
      },
    });
  }

  /**
   * Recherche un journal avec tous
   * ses paiements.
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

        _count: {
          select: {
            paiements: true,
          },
        },
      },
    });
  }

  /**
   * Liste paginée des journaux.
   *
   * Le filtre d’accès sera construit dans
   * le service :
   *
   * CAISSIER :
   * uniquement ses propres journaux.
   *
   * ADMIN et RESPONSABLE :
   * tous les journaux.
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
   * Calcule les totaux financiers
   * d’un journal.
   *
   * Seuls les paiements au statut PAYE
   * sont pris en compte.
   */
  async getTotals(
    journalCaisseId: string
  ) {
    const [
      aggregate,
      nombrePaiements,
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
    ]);

    return {
      nombrePaiements,

      montantTotalExigible:
        aggregate
          ._sum
          .montantExigible ??
        new Prisma.Decimal(0),

      montantTotalRemis:
        aggregate
          ._sum
          .montantRemis ??
        new Prisma.Decimal(0),

      monnaieTotaleRendue:
        aggregate
          ._sum
          .monnaieRendue ??
        new Prisma.Decimal(0),

      montantTotalEncaisse:
        aggregate
          ._sum
          .montantEncaisse ??
        new Prisma.Decimal(0),
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
          },
        },
      },
    });
  }
}