import type {
  CategorieOperationFonciere,
} from "@prisma/client";

import prisma from "../config/prisma";


export class TarificationRepository {
  /**
   * Recherche les opérations foncières actives
   * sélectionnées par l'utilisateur.
   */
  static async findOperationsActivesByIds(
    ids: string[]
  ) {
    return prisma.typeOperationFonciere.findMany({
      where: {
        id: {
          in: ids,
        },
        actif: true,
      },
      select: {
        id: true,
        code: true,
        libelle: true,
        categorie: true,
      },
    });
  }


  /**
   * Retourne le tarif d'inscription actuellement
   * applicable à la date indiquée.
   */
  static async findTarifInscriptionActif(
    date: Date
  ) {
    return prisma.tarifInscription.findFirst({
      where: {
        dateDebutValidite: {
          lte: date,
        },
        OR: [
          {
            dateFinValidite: null,
          },
          {
            dateFinValidite: {
              gte: date,
            },
          },
        ],
      },
      orderBy: {
        dateDebutValidite: "desc",
      },
    });
  }


  /**
   * Retourne le tarif applicable à une catégorie
   * d'opération foncière.
   */
  static async findTarifOperationActif(
    categorie: CategorieOperationFonciere,
    date: Date
  ) {
    return prisma.tarifOperationFonciere.findFirst({
      where: {
        categorie,
        dateDebutValidite: {
          lte: date,
        },
        OR: [
          {
            dateFinValidite: null,
          },
          {
            dateFinValidite: {
              gte: date,
            },
          },
        ],
      },
      orderBy: {
        dateDebutValidite: "desc",
      },
    });
  }


  /**
   * Recherche une prestation active.
   */
  static async findPrestationActiveById(
    id: string
  ) {
    return prisma.prestation.findFirst({
      where: {
        id,
        actif: true,
      },
      select: {
        id: true,
        code: true,
        libelle: true,
        tarificationParPage: true,
        supplementFrancaisApplicable: true,
        necessiteTitreFoncier: true,
      },
    });
  }


  /**
   * Recherche le tarif actuellement applicable
   * à une prestation.
   */
  static async findTarifPrestationActif(
    prestationId: string,
    date: Date
  ) {
    return prisma.tarifPrestation.findFirst({
      where: {
        prestationId,
        dateDebutValidite: {
          lte: date,
        },
        OR: [
          {
            dateFinValidite: null,
          },
          {
            dateFinValidite: {
              gte: date,
            },
          },
        ],
      },
      orderBy: {
        dateDebutValidite: "desc",
      },
    });
  }
}