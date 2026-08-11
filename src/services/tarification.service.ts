import {
  Prisma,
  TypeLigneTarification,
} from "@prisma/client";

import { TarificationRepository } from "../repositories/tarification.repository";

import type {
  CalculTarificationInput,
} from "../validations/tarification.validation";

import { AppError } from "../errors/AppError";


type LigneCalculTarification = {
  type: TypeLigneTarification;
  code: string;
  libelle: string;
  quantite: number;
  montantUnitaire: string;
  montant: string;
};


type ResultatTarification = {
  nature: "INSCRIPTION" | "PRESTATION";

  prestation?: {
    id: string;
    code: string;
    libelle: string;
  };

  nombrePages?: number;

  langue?: "ARABE" | "FRANCAIS";

  lignes: LigneCalculTarification[];

  montantTotal: string;

  referenceReglementaire: string;
};


export class TarificationService {
  /**
   * Point d'entrée principal du moteur.
   */
  static async calculer(
    input: CalculTarificationInput
  ): Promise<ResultatTarification> {
    if (input.nature === "INSCRIPTION") {
      return this.calculerInscription(
        input.operationFonciereIds
      );
    }

    return this.calculerPrestation({
      prestationId: input.prestationId,
      nombrePages: input.nombrePages,
      langue: input.langue,
    });
  }


  /**
   * Calcul d'une demande d'inscription.
   */
  private static async calculerInscription(
    operationFonciereIds: string[]
  ): Promise<ResultatTarification> {
    const dateCalcul = new Date();

    const operations =
      await TarificationRepository
        .findOperationsActivesByIds(
          operationFonciereIds
        );

    /**
     * Tous les identifiants envoyés doivent
     * correspondre à des opérations existantes.
     */
    if (
      operations.length !==
      operationFonciereIds.length
    ) {
      throw new AppError(
        "Une ou plusieurs opérations foncières sont invalides ou inactives.",
        400
      );
    }


    const tarifInscription =
      await TarificationRepository
        .findTarifInscriptionActif(
          dateCalcul
        );

    if (!tarifInscription) {
      throw new AppError(
        "Aucun tarif d'inscription actif n'est configuré.",
        500
      );
    }


    const lignes: LigneCalculTarification[] =
      [];

    let montantTotal =
      new Prisma.Decimal(0);


    // ========================================================
    // ARCHIVAGE
    // ========================================================

    const montantArchivage =
      new Prisma.Decimal(
        tarifInscription.montantArchivage
      );

    lignes.push({
      type:
        TypeLigneTarification
          .ARCHIVAGE_DOSSIER,

      code:
        "ARCHIVAGE_DOSSIER",

      libelle:
        "Archivage du dossier d'inscription",

      quantite: 1,

      montantUnitaire:
        montantArchivage.toFixed(3),

      montant:
        montantArchivage.toFixed(3),
    });

    montantTotal =
      montantTotal.plus(
        montantArchivage
      );


    // ========================================================
    // OPERATIONS FONCIERES
    // ========================================================

    const references =
      new Set<string>();

    references.add(
      tarifInscription
        .referenceReglementaire
    );


    for (const operation of operations) {
      const tarifOperation =
        await TarificationRepository
          .findTarifOperationActif(
            operation.categorie,
            dateCalcul
          );

      if (!tarifOperation) {
        throw new AppError(
          `Aucun tarif actif n'est configuré pour l'opération « ${operation.libelle} ».`,
          500
        );
      }


      const montantUnitaire =
        new Prisma.Decimal(
          tarifOperation.montantEtude
        );


      lignes.push({
        type:
          TypeLigneTarification
            .ETUDE_OPERATION,

        code:
          `OPERATION_${operation.code}`,

        libelle:
          `Étude – ${operation.libelle}`,

        quantite: 1,

        montantUnitaire:
          montantUnitaire.toFixed(3),

        montant:
          montantUnitaire.toFixed(3),
      });


      montantTotal =
        montantTotal.plus(
          montantUnitaire
        );


      references.add(
        tarifOperation
          .referenceReglementaire
      );
    }


    return {
      nature: "INSCRIPTION",

      lignes,

      montantTotal:
        montantTotal.toFixed(3),

      referenceReglementaire:
        Array.from(references).join(
          " | "
        ),
    };
  }


  /**
   * Calcul tarifaire d'une prestation.
   */
  private static async calculerPrestation(
    params: {
      prestationId: string;
      nombrePages?: number;
      langue: "ARABE" | "FRANCAIS";
    }
  ): Promise<ResultatTarification> {
    const dateCalcul = new Date();

    const prestation =
      await TarificationRepository
        .findPrestationActiveById(
          params.prestationId
        );

    if (!prestation) {
      throw new AppError(
        "Prestation introuvable ou inactive.",
        404
      );
    }


    /**
     * Certaines prestations nécessitent
     * obligatoirement le nombre de pages.
     */
    if (
      prestation.tarificationParPage &&
      params.nombrePages === undefined
    ) {
      throw new AppError(
        "Le nombre de pages est obligatoire pour cette prestation.",
        400
      );
    }


    const tarif =
      await TarificationRepository
        .findTarifPrestationActif(
          prestation.id,
          dateCalcul
        );

    if (!tarif) {
      throw new AppError(
        "Aucun tarif actif n'est configuré pour cette prestation.",
        500
      );
    }


    const lignes: LigneCalculTarification[] =
      [];

    let montantTotal =
      new Prisma.Decimal(0);


    // ========================================================
    // MONTANT DE BASE
    // ========================================================

    const montantBase =
      new Prisma.Decimal(
        tarif.montantBase
      );


    if (montantBase.greaterThan(0)) {
      lignes.push({
        type:
          TypeLigneTarification
            .BASE_PRESTATION,

        code:
          `BASE_${prestation.code}`,

        libelle:
          prestation.libelle,

        quantite: 1,

        montantUnitaire:
          montantBase.toFixed(3),

        montant:
          montantBase.toFixed(3),
      });


      montantTotal =
        montantTotal.plus(
          montantBase
        );
    }


    // ========================================================
    // TARIFICATION PAR PAGE
    // ========================================================

    if (
      prestation.tarificationParPage &&
      params.nombrePages !== undefined
    ) {
      const tarifParPage =
        new Prisma.Decimal(
          tarif.montantParPage
        );

      const montantPages =
        tarifParPage.mul(
          params.nombrePages
        );


      if (montantPages.greaterThan(0)) {
        lignes.push({
          type:
            TypeLigneTarification
              .TARIFICATION_PAGE,

          code:
            `PAGES_${prestation.code}`,

          libelle:
            `${params.nombrePages} page(s) × ${tarifParPage.toFixed(3)} DT`,

          quantite:
            params.nombrePages,

          montantUnitaire:
            tarifParPage.toFixed(3),

          montant:
            montantPages.toFixed(3),
        });


        montantTotal =
          montantTotal.plus(
            montantPages
          );
      }
    }


    // ========================================================
    // SUPPLEMENT LANGUE FRANCAISE
    // ========================================================

    if (
      params.langue === "FRANCAIS" &&
      prestation
        .supplementFrancaisApplicable
    ) {
      const supplementFrancais =
        new Prisma.Decimal(
          tarif.supplementFrancais
        );


      if (
        supplementFrancais.greaterThan(0)
      ) {
        lignes.push({
          type:
            TypeLigneTarification
              .SUPPLEMENT_FRANCAIS,

          code:
            "SUPPLEMENT_FRANCAIS",

          libelle:
            "Supplément pour prestation en langue française",

          quantite: 1,

          montantUnitaire:
            supplementFrancais.toFixed(
              3
            ),

          montant:
            supplementFrancais.toFixed(
              3
            ),
        });


        montantTotal =
          montantTotal.plus(
            supplementFrancais
          );
      }
    }


    return {
      nature: "PRESTATION",

      prestation: {
        id: prestation.id,
        code: prestation.code,
        libelle: prestation.libelle,
      },

      nombrePages:
        prestation.tarificationParPage
          ? params.nombrePages
          : undefined,

      langue:
        params.langue,

      lignes,

      montantTotal:
        montantTotal.toFixed(3),

      referenceReglementaire:
        tarif.referenceReglementaire,
    };
  }
}