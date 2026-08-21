import {
  NatureDemande,
  Prisma,
  StatutDemande,
  StatutPaiement,
  StatutRevisionDemande,
  StatutTarification,
} from "@prisma/client";

import { AppError } from "../errors/AppError";

import {
  DemandeRepository,
} from "../repositories/demande.repository";

import {
  PaiementRepository,
} from "../repositories/paiement.repository";

import {
  RevisionDemandeRepository,
} from "../repositories/revision-demande.repository";

import type {
  CorrigerDemandeResponsableDto,
} from "../validations/responsable-demande.validation";

import {
  ReferentielService,
} from "./referentiel.service";

import {
  TarificationService,
} from "./tarification.service";

import {
  GuichetJourneeService,
} from "./guichet-journee.service";

export class ResponsableDemandeService {
  private demandeRepository =
    new DemandeRepository();

  private paiementRepository =
    new PaiementRepository();

  private revisionRepository =
    new RevisionDemandeRepository();

  private guichetJourneeService =
    new GuichetJourneeService();

  /**
   * Compare deux listes d'identifiants comme des ensembles.
   * L'ordre d'affichage ne constitue pas une correction métier.
   */
  private sameIds(
    first: string[],
    second: string[]
  ): boolean {
    if (
      first.length !==
      second.length
    ) {
      return false;
    }

    const secondSet =
      new Set(second);

    return first.every(
      (id) =>
        secondSet.has(id)
    );
  }

  /**
   * Correction d'une inscription déjà payée et transmise
   * au Responsable Guichet.
   *
   * Règles principales :
   * - demande obligatoirement EN_COURS ;
   * - paiement initial obligatoirement PAYE ;
   * - snapshot tarifaire initial jamais écrasé ;
   * - baisse tarifaire refusée tant qu'aucune règle de
   *   remboursement n'est définie ;
   * - hausse = création d'un complément à payer ;
   * - correction sans hausse = révision sans complément.
   */
  async corrigerInscription(
    demandeId: string,
    data:
      CorrigerDemandeResponsableDto,
    responsableId: string,
    role: string
  ) {
    if (
      role !== "RESPONSABLE" &&
      role !== "ADMIN"
    ) {
      throw new AppError(
        "Seul le Responsable Guichet peut corriger une demande transmise.",
        403
      );
    }

    /*
     * Une fois la journée du guichet clôturée,
     * aucune nouvelle correction métier ne peut
     * être enregistrée par le Responsable.
     *
     * Le paiement complémentaire reste traité
     * séparément et peut intervenir ultérieurement.
     */
    await this.guichetJourneeService
      .assertJourneeOuverte();

    const demande =
      await this.demandeRepository
        .findById(
          demandeId
        );

    if (!demande) {
      throw new AppError(
        "Demande introuvable.",
        404
      );
    }

    if (
      demande.statut !==
      StatutDemande.EN_COURS
    ) {
      throw new AppError(
        "Seule une demande en cours de contrôle au guichet peut être corrigée par le Responsable.",
        400
      );
    }

    if (
      demande.nature !==
      NatureDemande.INSCRIPTION
    ) {
      throw new AppError(
        "Cette première version de la correction Responsable concerne uniquement les demandes d'inscription foncière.",
        400
      );
    }

    if (
      !demande.titreFoncier
    ) {
      throw new AppError(
        "Le titre foncier de la demande est introuvable.",
        400
      );
    }

    if (
      !demande.tarification
    ) {
      throw new AppError(
        "Le snapshot tarifaire initial de la demande est introuvable.",
        400
      );
    }

    if (
      demande.tarification.statut !==
      StatutTarification.FIGEE
    ) {
      throw new AppError(
        "La tarification initiale de la demande doit être figée avant le contrôle du Responsable.",
        400
      );
    }

    const paiement =
      await this.paiementRepository
        .findByDemandeId(
          demandeId
        );

    if (!paiement) {
      throw new AppError(
        "La demande doit avoir été payée avant le contrôle du Responsable.",
        400
      );
    }

    if (
      paiement.statut !==
      StatutPaiement.PAYE
    ) {
      throw new AppError(
        "Le paiement initial de la demande n'est pas valide.",
        400
      );
    }

    const pendingRevision =
      await this.revisionRepository
        .findPendingComplementByDemandeId(
          demandeId
        );

    if (pendingRevision) {
      throw new AppError(
        `La révision n°${pendingRevision.numeroRevision} attend encore un complément de paiement. Régularisez ce complément avant d'enregistrer une nouvelle correction tarifaire.`,
        409
      );
    }

    const numeroTitreFinal =
      data.numeroTitreFoncier
        ?.trim() ??
      demande.titreFoncier
        .numero;

    const gouvernoratIdFinal =
      data.gouvernoratId ??
      demande.titreFoncier
        .gouvernoratId;

    const operationIdsAvant =
      demande
        .operationsFoncieres
        .map(
          (item) =>
            item
              .typeOperationFonciereId
        );

    const operationIdsApres =
      data.operationFonciereIds ??
      operationIdsAvant;

    if (
      operationIdsApres.length ===
      0
    ) {
      throw new AppError(
        "Au moins une opération foncière est obligatoire.",
        400
      );
    }

    const gouvernorat =
      await ReferentielService
        .getGouvernoratById(
          gouvernoratIdFinal
        );

    if (!gouvernorat) {
      throw new AppError(
        "Gouvernorat introuvable ou inactif.",
        404
      );
    }

    /*
     * On récupère les opérations afin de valider leur existence
     * et de produire un snapshot lisible dans l'historique.
     */
    const operationDetails =
      await Promise.all(
        operationIdsApres.map(
          async (id) => {
            const operation =
              await ReferentielService
                .getOperationFonciereById(
                  id
                );

            if (!operation) {
              throw new AppError(
                "Une ou plusieurs opérations foncières sont invalides ou inactives.",
                400
              );
            }

            return operation;
          }
        )
      );

    const titleChanged =
      numeroTitreFinal !==
        demande.titreFoncier
          .numero ||
      gouvernoratIdFinal !==
        demande.titreFoncier
          .gouvernoratId;

    const operationsChanged =
      !this.sameIds(
        operationIdsAvant,
        operationIdsApres
      );

    if (
      !titleChanged &&
      !operationsChanged
    ) {
      throw new AppError(
        "Aucune modification réelle n'a été détectée sur la demande.",
        400
      );
    }

    /*
     * Nouveau calcul basé sur l'état corrigé.
     * Le résultat est stocké dans RevisionDemande et NON dans
     * TarificationDemande, qui reste le snapshot du paiement initial.
     */
    const nouvelleTarification =
      await TarificationService
        .calculer({
          nature:
            "INSCRIPTION",

          operationFonciereIds:
            operationIdsApres,
        });

    const latestRevision =
      await this.revisionRepository
        .findLatestByDemandeId(
          demandeId
        );

    const montantAvant =
      latestRevision
        ? new Prisma.Decimal(
            latestRevision
              .montantApres
          )
        : new Prisma.Decimal(
            demande
              .tarification
              .montantTotal
          );

    const montantApres =
      new Prisma.Decimal(
        nouvelleTarification
          .montantTotal
      );

    if (
      montantApres.lessThan(
        montantAvant
      )
    ) {
      throw new AppError(
        `La correction ferait passer le tarif de ${montantAvant.toFixed(
          3
        )} DT à ${montantApres.toFixed(
          3
        )} DT. Une baisse tarifaire nécessite une règle de remboursement qui n'est pas encore définie. La correction est donc bloquée.`,
        409
      );
    }

    const complementDu =
      montantApres.minus(
        montantAvant
      );

    const statutRevision =
      complementDu.greaterThan(0)
        ? StatutRevisionDemande
            .COMPLEMENT_A_PAYER
        : StatutRevisionDemande
            .SANS_COMPLEMENT;

    const donneesAvant = {
      nature:
        demande.nature,

      numeroTitreFoncier:
        demande
          .titreFoncier
          .numero,

      gouvernorat: {
        id:
          demande
            .titreFoncier
            .gouvernorat
            .id,

        code:
          demande
            .titreFoncier
            .gouvernorat
            .code,

        nom:
          demande
            .titreFoncier
            .gouvernorat
            .nom,
      },

      operations:
        demande
          .operationsFoncieres
          .map(
            (item) => ({
              id:
                item
                  .typeOperationFonciere
                  .id,

              code:
                item
                  .typeOperationFonciere
                  .code,

              libelle:
                item
                  .typeOperationFonciere
                  .libelle,
            })
          ),
    } satisfies Prisma.InputJsonObject;

    const donneesApres = {
      nature:
        demande.nature,

      numeroTitreFoncier:
        numeroTitreFinal,

      gouvernorat: {
        id:
          gouvernorat.id,

        code:
          gouvernorat.code,

        nom:
          gouvernorat.nom,
      },

      operations:
        operationDetails.map(
          (operation) => ({
            id:
              operation.id,

            code:
              operation.code,

            libelle:
              operation.libelle,
          })
        ),
    } satisfies Prisma.InputJsonObject;

    try {
      const result =
        await this.revisionRepository
          .createInscriptionRevisionAndApplyCorrection({
            demandeId,

            responsableId,

            numeroTitreFoncier:
              numeroTitreFinal,

            gouvernoratId:
              gouvernorat.id,

            gouvernoratCode:
              gouvernorat.code,

            operationFonciereIds:
              operationIdsApres,

            replaceOperations:
              operationsChanged,

            donneesAvant,

            donneesApres,

            motif:
              data.motif
                ?.trim() ||
              null,

            montantAvant,

            montantApres,

            complementDu,

            referenceReglementaire:
              nouvelleTarification
                .referenceReglementaire,

            statut:
              statutRevision,

            lignes:
              nouvelleTarification
                .lignes
                .map(
                  (
                    ligne,
                    index
                  ) => ({
                    type:
                      ligne.type,

                    code:
                      ligne.code ||
                      null,

                    libelle:
                      ligne.libelle,

                    quantite:
                      ligne.quantite,

                    montantUnitaire:
                      new Prisma.Decimal(
                        ligne
                          .montantUnitaire
                      ),

                    montant:
                      new Prisma.Decimal(
                        ligne.montant
                      ),

                    ordre:
                      index + 1,
                  })
                ),
          });

      return {
        ...result,

        resumeTarification: {
          montantAvant:
            montantAvant.toFixed(
              3
            ),

          montantApres:
            montantApres.toFixed(
              3
            ),

          complementDu:
            complementDu.toFixed(
              3
            ),

          complementRequis:
            complementDu
              .greaterThan(0),
        },
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "PENDING_COMPLEMENT"
      ) {
        throw new AppError(
          "Un complément de paiement est déjà en attente pour cette demande.",
          409
        );
      }

      throw error;
    }
  }
}
