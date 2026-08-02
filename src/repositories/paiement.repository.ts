import type {
  Prisma,
} from "@prisma/client";

import prisma from "../config/prisma";

export class PaiementRepository {
  /**
   * Recherche le paiement associé à une demande.
   *
   * Comme demandeId est unique dans le modèle
   * Paiement, une demande ne peut avoir qu’un
   * seul paiement.
   */
  async findByDemandeId(
    demandeId: string
  ) {
    return prisma.paiement.findUnique({
      where: {
        demandeId,
      },

      include: {
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
          select: {
            id: true,
            numero: true,
            nomDemandeur: true,
            prenomDemandeur: true,
            cin: true,
            nombreExemplaires: true,
            langueCertificat: true,
            traductionDemandee: true,
            prixUnitaire: true,
            supplementTraduction: true,
            montantTotal: true,
            statut: true,
          },
        },
      },
    });
  }

  /**
   * Recherche un paiement par son identifiant.
   */
  async findById(
    id: string
  ) {
    return prisma.paiement.findUnique({
      where: {
        id,
      },

      include: {
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
          select: {
            id: true,
            numero: true,
            nomDemandeur: true,
            prenomDemandeur: true,
            cin: true,
            telephone: true,
            email: true,
            referenceFonciere: true,
            adresseBien: true,
            nombreExemplaires: true,
            langueCertificat: true,
            traductionDemandee: true,
            prixUnitaire: true,
            supplementTraduction: true,
            montantTotal: true,
            statut: true,
          },
        },
      },
    });
  }

  /**
   * Recherche le dernier numéro de reçu créé
   * pour une année précise.
   *
   * Exemple :
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
   * Enregistre un nouveau paiement.
   */
  async create(
    data:
      Prisma.PaiementCreateInput
  ) {
    return prisma.paiement.create({
      data,

      include: {
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
          select: {
            id: true,
            numero: true,
            nomDemandeur: true,
            prenomDemandeur: true,
            cin: true,
            telephone: true,
            referenceFonciere: true,
            nombreExemplaires: true,
            langueCertificat: true,
            traductionDemandee: true,
            prixUnitaire: true,
            supplementTraduction: true,
            montantTotal: true,
            statut: true,
          },
        },
      },
    });
  }
}