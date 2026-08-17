import {
  ModePaiement,
  Prisma,
  StatutPaiement,
} from "@prisma/client";

import { AppError } from "../errors/AppError";

import {
  PaiementComplementaireRepository,
} from "../repositories/paiement-complementaire.repository";

import {
  PaiementRepository,
} from "../repositories/paiement.repository";

import {
  RevisionDemandeRepository,
} from "../repositories/revision-demande.repository";

import {
  UserRepository,
} from "../repositories/user.repository";

import type {
  CreatePaiementDto,
} from "../validations/paiement.validation";

import {
  JournalCaisseService,
} from "./journal-caisse.service";

import {
  RecuPaiementComplementaireService,
} from "../services/recu-paiement-complementaire.service";

export class PaiementComplementaireService {
  private static readonly PREFIX_RECU =
    "REC-COMP";

  private paiementComplementaireRepository =
    new PaiementComplementaireRepository();

  private paiementRepository =
    new PaiementRepository();

  private revisionRepository =
    new RevisionDemandeRepository();

  private userRepository =
    new UserRepository();

  private journalCaisseService =
    new JournalCaisseService();

  private recuPaiementComplementaireService =
    new RecuPaiementComplementaireService();

  /**
   * Génère un numéro propre aux compléments.
   *
   * Exemple : REC-COMP-2026-000001
   */
  private async generateNumeroRecu():
    Promise<string> {
    const year =
      new Date().getFullYear();

    const lastPaiement =
      await this
        .paiementComplementaireRepository
        .findLastNumeroRecu(
          year
        );

    if (!lastPaiement) {
      return `${PaiementComplementaireService.PREFIX_RECU}-${year}-000001`;
    }

    const expression =
      /^REC-COMP-\d{4}-(\d{6})$/;

    const match =
      lastPaiement.numeroRecu
        .match(
          expression
        );

    if (
      !match ||
      !match[1]
    ) {
      throw new AppError(
        "Le dernier numéro de reçu complémentaire est invalide.",
        500
      );
    }

    const lastNumber =
      Number(
        match[1]
      );

    if (
      Number.isNaN(
        lastNumber
      )
    ) {
      throw new AppError(
        "Le dernier numéro de reçu complémentaire est invalide.",
        500
      );
    }

    const nextNumber =
      String(
        lastNumber + 1
      ).padStart(
        6,
        "0"
      );

    return `${PaiementComplementaireService.PREFIX_RECU}-${year}-${nextNumber}`;
  }

  /**
   * Enregistre le complément associé à la
   * révision tarifaire encore en attente.
   *
   * Important :
   * - le paiement initial n'est jamais modifié ;
   * - la TarificationDemande initiale reste FIGEE ;
   * - seule RevisionDemande passe de
   *   COMPLEMENT_A_PAYER à COMPLEMENT_PAYE.
   *
   * Aucune règle liée à la clôture du guichet n'est
   * ajoutée ici pour le moment : ce point métier reste
   * à confirmer séparément.
   */
  async create(
    demandeId: string,
    data: CreatePaiementDto,
    caissierId: string,
    role: string
  ) {
    if (
      role !== "CAISSIER" &&
      role !== "ADMIN"
    ) {
      throw new AppError(
        "Seul un caissier peut enregistrer un complément de paiement.",
        403
      );
    }

    const caissier =
      await this.userRepository
        .findById(
          caissierId
        );

    if (!caissier) {
      throw new AppError(
        "Caissier introuvable.",
        404
      );
    }

    if (!caissier.statut) {
      throw new AppError(
        "Le compte du caissier est désactivé.",
        403
      );
    }

    /*
     * Le paiement initial doit exister et être PAYE.
     */
    const paiementInitial =
      await this.paiementRepository
        .findByDemandeId(
          demandeId
        );

    if (!paiementInitial) {
      throw new AppError(
        "Le paiement initial de cette demande est introuvable.",
        400
      );
    }

    if (
      paiementInitial.statut !==
      StatutPaiement.PAYE
    ) {
      throw new AppError(
        "Le paiement initial de cette demande n'est pas valide.",
        400
      );
    }

    /*
     * Une seule révision peut attendre un complément
     * grâce au garde-fou posé côté Responsable.
     */
    const revision =
      await this.revisionRepository
        .findPendingComplementByDemandeId(
          demandeId
        );

    if (!revision) {
      throw new AppError(
        "Aucun complément de paiement n'est actuellement exigible pour cette demande.",
        404
      );
    }

    if (
      revision
        .paiementComplementaire
    ) {
      throw new AppError(
        "Le complément de cette révision a déjà été payé.",
        409
      );
    }

    const montantExigible =
      new Prisma.Decimal(
        revision
          .complementDu
          .toString()
      );

    if (
      montantExigible
        .lessThanOrEqualTo(0)
    ) {
      throw new AppError(
        "Le montant du complément à payer est invalide.",
        400
      );
    }

    const montantRemis =
      new Prisma.Decimal(
        data.montantRemis
      );

    if (
      montantRemis.lessThan(
        montantExigible
      )
    ) {
      throw new AppError(
        `Le montant remis est insuffisant. Le complément exigible est de ${montantExigible.toFixed(
          3
        )} DT.`,
        400
      );
    }

    const montantEncaisse =
      montantExigible;

    const monnaieRendue =
      montantRemis.minus(
        montantExigible
      );

    const journalCaisse =
      await this
        .journalCaisseService
        .getOrCreateJournalDuJour(
          caissierId
        );

    const numeroRecu =
      await this
        .generateNumeroRecu();

    const datePaiement =
      new Date();

    try {
      const paiement =
        await this
          .paiementComplementaireRepository
          .createAndMarkRevisionPaid({
            revisionId:
              revision.id,

            data: {
              numeroRecu,

              montantExigible,

              montantRemis,

              monnaieRendue,

              montantEncaisse,

              modePaiement:
                ModePaiement.ESPECES,

              statut:
                StatutPaiement.PAYE,

              montantEnLettres:
                null,

              observations:
                data.observations ||
                null,

              datePaiement,

              demande: {
                connect: {
                  id:
                    demandeId,
                },
              },

              revision: {
                connect: {
                  id:
                    revision.id,
                },
              },

              caissier: {
                connect: {
                  id:
                    caissierId,
                },
              },

              journalCaisse: {
                connect: {
                  id:
                    journalCaisse.id,
                },
              },
            },
          });

      return {
        paiement,

        regularisation: {
          revisionId:
            revision.id,

          numeroRevision:
            revision.numeroRevision,

          montantAvant:
            revision
              .montantAvant
              .toFixed(3),

          montantApres:
            revision
              .montantApres
              .toFixed(3),

          complementPaye:
            montantExigible
              .toFixed(3),

          statut:
            "COMPLEMENT_PAYE" as const,
        },
      };
    } catch (error) {
      if (
        error instanceof Error
      ) {
        if (
          error.message ===
          "REVISION_NOT_FOUND"
        ) {
          throw new AppError(
            "La révision tarifaire est introuvable.",
            404
          );
        }

        if (
          error.message ===
          "REVISION_NOT_PENDING"
        ) {
          throw new AppError(
            "Cette révision n'attend plus de complément de paiement.",
            409
          );
        }

        if (
          error.message ===
          "COMPLEMENT_ALREADY_PAID"
        ) {
          throw new AppError(
            "Le complément de cette révision a déjà été payé.",
            409
          );
        }
      }

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Le complément n'a pas pu être enregistré car un paiement complémentaire identique existe déjà.",
          409
        );
      }

      throw error;
    }
  }
  /**
   * Retourne l'état de la dernière régularisation tarifaire
   * d'une demande, qu'elle soit sans complément, en attente
   * de paiement ou déjà payée.
   */
  async findEtatByDemandeId(
    demandeId: string
  ) {
    const revision =
      await this.revisionRepository
        .findLatestByDemandeId(
          demandeId
        );

    if (!revision) {
      return {
        revision: null,
        paiement: null,
        regularisation: null,
      };
    }

    const paiement =
      revision.paiementComplementaire
        ? await this
            .paiementComplementaireRepository
            .findByRevisionId(
              revision.id
            )
        : null;

    return {
      revision,
      paiement,
      regularisation: {
        revisionId: revision.id,
        numeroRevision:
          revision.numeroRevision,
        montantAvant:
          revision.montantAvant.toFixed(3),
        montantApres:
          revision.montantApres.toFixed(3),
        complementDu:
          revision.complementDu.toFixed(3),
        statut: revision.statut,
      },
    };
  }

  /**
   * Génère le reçu PDF du dernier complément effectivement
   * encaissé pour une demande.
   */
  async generateRecuByDemandeId(
    demandeId: string
  ): Promise<{
    buffer: Buffer;
    numeroRecu: string;
  }> {
    const paiement =
      await this
        .paiementComplementaireRepository
        .findLatestByDemandeId(
          demandeId
        );

    if (!paiement) {
      throw new AppError(
        "Aucun paiement complémentaire encaissé n'a été trouvé pour cette demande.",
        404
      );
    }

    if (
      paiement.statut !==
      StatutPaiement.PAYE
    ) {
      throw new AppError(
        "Le paiement complémentaire n'est pas dans un état permettant l'édition du reçu.",
        409
      );
    }

    const buffer =
      await this
        .recuPaiementComplementaireService
        .generate(
          paiement
        );

    return {
      buffer,
      numeroRecu:
        paiement.numeroRecu,
    };
  }

}
