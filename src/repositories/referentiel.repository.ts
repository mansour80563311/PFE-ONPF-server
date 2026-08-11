import prisma from "../config/prisma";

export class ReferentielRepository {
  /**
   * Retourne les gouvernorats actifs.
   */
  static async findGouvernoratsActifs() {
    return prisma.gouvernorat.findMany({
      where: {
        actif: true,
      },
      orderBy: {
        nom: "asc",
      },
      select: {
        id: true,
        code: true,
        nom: true,
      },
    });
  }

  /**
   * Retourne les types d'opérations foncières actifs.
   */
  static async findOperationsFoncieresActives() {
    return prisma.typeOperationFonciere.findMany({
      where: {
        actif: true,
      },
      orderBy: {
        libelle: "asc",
      },
      select: {
        id: true,
        code: true,
        libelle: true,
        description: true,
        categorie: true,
      },
    });
  }

  /**
   * Retourne les prestations actives.
   *
   * Les montants tarifaires ne sont volontairement
   * pas calculés ici. Le futur TarificationService
   * sera responsable de cette logique.
   */
  static async findPrestationsActives() {
    return prisma.prestation.findMany({
      where: {
        actif: true,
      },
      orderBy: {
        libelle: "asc",
      },
      select: {
        id: true,
        code: true,
        libelle: true,
        description: true,
        tarificationParPage: true,
        supplementFrancaisApplicable: true,
        necessiteTitreFoncier: true,
      },
    });
  }

  /**
   * Recherche un gouvernorat actif par son identifiant.
   */
  static async findGouvernoratActifById(id: string) {
    return prisma.gouvernorat.findFirst({
      where: {
        id,
        actif: true,
      },
      select: {
        id: true,
        code: true,
        nom: true,
      },
    });
  }

  /**
   * Recherche une opération foncière active
   * par son identifiant.
   */
  static async findOperationFonciereActiveById(id: string) {
    return prisma.typeOperationFonciere.findFirst({
      where: {
        id,
        actif: true,
      },
      select: {
        id: true,
        code: true,
        libelle: true,
        description: true,
        categorie: true,
      },
    });
  }

  /**
   * Recherche une prestation active
   * par son identifiant.
   */
  static async findPrestationActiveById(id: string) {
    return prisma.prestation.findFirst({
      where: {
        id,
        actif: true,
      },
      select: {
        id: true,
        code: true,
        libelle: true,
        description: true,
        tarificationParPage: true,
        supplementFrancaisApplicable: true,
        necessiteTitreFoncier: true,
      },
    });
  }
}