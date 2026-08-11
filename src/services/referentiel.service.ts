import { ReferentielRepository } from "../repositories/referentiel.repository";

export class ReferentielService {
  /**
   * Liste des gouvernorats utilisables
   * dans le formulaire de demande.
   */
  static async getGouvernorats() {
    return ReferentielRepository.findGouvernoratsActifs();
  }

  /**
   * Liste des opérations foncières utilisables
   * dans une demande d'inscription.
   */
  static async getOperationsFoncieres() {
    return ReferentielRepository.findOperationsFoncieresActives();
  }

  /**
   * Liste des prestations disponibles.
   */
  static async getPrestations() {
    return ReferentielRepository.findPrestationsActives();
  }

  /**
   * Recherche d'un gouvernorat.
   */
  static async getGouvernoratById(id: string) {
    return ReferentielRepository.findGouvernoratActifById(id);
  }

  /**
   * Recherche d'une opération foncière.
   */
  static async getOperationFonciereById(id: string) {
    return ReferentielRepository.findOperationFonciereActiveById(id);
  }

  /**
   * Recherche d'une prestation.
   */
  static async getPrestationById(id: string) {
    return ReferentielRepository.findPrestationActiveById(id);
  }
}