import {
  Prisma,
  StatutJournalCaisse,
} from "@prisma/client";

import {
  AppError,
} from "../errors/AppError";

import {
  JournalCaisseRepository,
} from "../repositories/journal-caisse.repository";

export class JournalCaisseService {
  private static readonly PREFIX_NUMERO =
    "JC";

  private journalCaisseRepository =
    new JournalCaisseRepository();

  /**
   * Normalise une date pour ne conserver
   * que l’année, le mois et le jour.
   *
   * Cela correspond au champ Prisma :
   * DateTime @db.Date
   */
  private normalizeDateJour(
    value: Date = new Date()
  ): Date {
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      )
    );
  }

  /**
   * Génère le numéro du prochain journal.
   *
   * Exemple :
   * JC-2026-000001
   */
  private async generateNumero():
    Promise<string> {
    const year =
      new Date().getFullYear();

    const lastJournal =
      await this
        .journalCaisseRepository
        .findLastNumero(
          year
        );

    if (!lastJournal) {
      return `${JournalCaisseService.PREFIX_NUMERO}-${year}-000001`;
    }

    const expression =
      /^JC-\d{4}-(\d{6})$/;

    const match =
      lastJournal.numero.match(
        expression
      );

    if (
      !match ||
      !match[1]
    ) {
      throw new AppError(
        "Le dernier numéro de journal de caisse est invalide.",
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
        "Le dernier numéro de journal de caisse est invalide.",
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

    return `${JournalCaisseService.PREFIX_NUMERO}-${year}-${nextNumber}`;
  }

  /**
   * Recherche le journal du jour du Caissier.
   *
   * S’il n’existe pas, il est créé
   * automatiquement.
   *
   * S’il est déjà clôturé, aucun nouveau
   * paiement ne peut être enregistré.
   */
  async getOrCreateJournalDuJour(
    caissierId: string
  ) {
    const dateJour =
      this.normalizeDateJour();

    const existingJournal =
      await this
        .journalCaisseRepository
        .findByCaissierAndDate(
          caissierId,
          dateJour
        );

    if (existingJournal) {
      if (
        existingJournal.statut ===
        StatutJournalCaisse.CLOTURE
      ) {
        throw new AppError(
          "La caisse de ce Caissier est déjà clôturée pour aujourd’hui. Aucun nouveau paiement ne peut être enregistré.",
          400
        );
      }

      return existingJournal;
    }

    /*
     * Plusieurs paiements pourraient être
     * enregistrés presque simultanément.
     *
     * La contrainte unique :
     * caissierId + dateJour
     *
     * protège contre la création de deux
     * journaux pour le même Caissier.
     */
    for (
      let attempt = 1;
      attempt <= 3;
      attempt += 1
    ) {
      const numero =
        await this.generateNumero();

      try {
        return await this
          .journalCaisseRepository
          .create({
            numero,

            dateJour,

            statut:
              StatutJournalCaisse.OUVERT,

            caissier: {
              connect: {
                id:
                  caissierId,
              },
            },
          });
      } catch (error) {
        if (
          error instanceof
            Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          /*
           * Un autre paiement a peut-être
           * créé le journal entre-temps.
           */
          const concurrentJournal =
            await this
              .journalCaisseRepository
              .findByCaissierAndDate(
                caissierId,
                dateJour
              );

          if (concurrentJournal) {
            if (
              concurrentJournal.statut ===
              StatutJournalCaisse.CLOTURE
            ) {
              throw new AppError(
                "La caisse de ce Caissier est déjà clôturée pour aujourd’hui.",
                400
              );
            }

            return concurrentJournal;
          }

          /*
           * Si le conflit concerne seulement
           * le numéro du journal, une nouvelle
           * tentative est effectuée.
           */
          if (
            attempt < 3
          ) {
            continue;
          }

          throw new AppError(
            "Le journal de caisse n’a pas pu être créé en raison d’un conflit de numérotation.",
            409
          );
        }

        throw error;
      }
    }

    throw new AppError(
      "Le journal de caisse n’a pas pu être créé.",
      500
    );
  }

  /**
   * Liste les journaux selon le rôle.
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
    utilisateurId: string,
    role: string
  ) {
    const rolesAutorises = [
      "ADMIN",
      "RESPONSABLE",
      "CAISSIER",
    ];

    if (
      !rolesAutorises.includes(
        role
      )
    ) {
      throw new AppError(
        "Vous n’êtes pas autorisé à consulter les journaux de caisse.",
        403
      );
    }

    const normalizedPage =
      Number.isInteger(page) &&
      page > 0
        ? page
        : 1;

    const normalizedLimit =
      Number.isInteger(limit) &&
      limit > 0
        ? Math.min(
            limit,
            100
          )
        : 10;

    const accessFilter:
      Prisma.JournalCaisseWhereInput =
        role === "CAISSIER"
          ? {
              caissierId:
                utilisateurId,
            }
          : {};

    const result =
      await this
        .journalCaisseRepository
        .findAll(
          normalizedPage,
          normalizedLimit,
          accessFilter
        );

    /*
     * Ajoute les totaux financiers
     * à chaque journal retourné.
     */
    const data =
      await Promise.all(
        result.data.map(
          async (
            journal
          ) => {
            const totals =
              await this
                .journalCaisseRepository
                .getTotals(
                  journal.id
                );

            return {
              ...journal,
              totals,
            };
          }
        )
      );

    return {
      ...result,
      data,
    };
  }

  /**
   * Consulte le détail d’un journal.
   */
  async findById(
    journalId: string,
    utilisateurId: string,
    role: string
  ) {
    const rolesAutorises = [
      "ADMIN",
      "RESPONSABLE",
      "CAISSIER",
    ];

    if (
      !rolesAutorises.includes(
        role
      )
    ) {
      throw new AppError(
        "Vous n’êtes pas autorisé à consulter ce journal de caisse.",
        403
      );
    }

    const journal =
      await this
        .journalCaisseRepository
        .findById(
          journalId
        );

    if (!journal) {
      throw new AppError(
        "Journal de caisse introuvable.",
        404
      );
    }

    /*
     * Un Caissier ne consulte que
     * ses propres journaux.
     */
    if (
      role === "CAISSIER" &&
      journal.caissierId !==
        utilisateurId
    ) {
      throw new AppError(
        "Vous ne pouvez consulter que vos propres journaux de caisse.",
        403
      );
    }

    const totals =
      await this
        .journalCaisseRepository
        .getTotals(
          journal.id
        );

    return {
      ...journal,
      totals,
    };
  }

  /**
   * Consulte le journal du jour.
   *
   * Cette méthode ne crée pas le journal.
   * Elle retourne une erreur 404 lorsque
   * aucun paiement n’a encore été réalisé.
   */
  async findJournalDuJour(
    utilisateurId: string,
    role: string,
    caissierId?: string
  ) {
    const rolesAutorises = [
      "ADMIN",
      "RESPONSABLE",
      "CAISSIER",
    ];

    if (
      !rolesAutorises.includes(
        role
      )
    ) {
      throw new AppError(
        "Vous n’êtes pas autorisé à consulter le journal de caisse du jour.",
        403
      );
    }

    /*
     * Le Caissier ne peut demander que
     * son propre journal.
     *
     * L’Administrateur et le Responsable
     * doivent préciser le Caissier concerné.
     */
    const targetCaissierId =
      role === "CAISSIER"
        ? utilisateurId
        : caissierId;

    if (!targetCaissierId) {
      throw new AppError(
        "L’identifiant du Caissier est obligatoire.",
        400
      );
    }

    const dateJour =
      this.normalizeDateJour();

    const journal =
      await this
        .journalCaisseRepository
        .findByCaissierAndDate(
          targetCaissierId,
          dateJour
        );

    if (!journal) {
      throw new AppError(
        "Aucun journal de caisse n’existe encore pour cette journée.",
        404
      );
    }

    const totals =
      await this
        .journalCaisseRepository
        .getTotals(
          journal.id
        );

    return {
      ...journal,
      totals,
    };
  }

  /**
   * Clôture un journal de caisse.
   *
   * CAISSIER :
   * clôture uniquement son propre journal.
   *
   * ADMIN :
   * peut exceptionnellement clôturer
   * n’importe quel journal.
   *
   * RESPONSABLE :
   * consultation uniquement.
   */
  async close(
    journalId: string,
    utilisateurId: string,
    role: string,
    observations?: string
  ) {
    if (
      role !== "ADMIN" &&
      role !== "CAISSIER"
    ) {
      throw new AppError(
        "Seul le Caissier ou l’Administrateur peut clôturer un journal de caisse.",
        403
      );
    }

    const journal =
      await this
        .journalCaisseRepository
        .findById(
          journalId
        );

    if (!journal) {
      throw new AppError(
        "Journal de caisse introuvable.",
        404
      );
    }

    if (
      role === "CAISSIER" &&
      journal.caissierId !==
        utilisateurId
    ) {
      throw new AppError(
        "Vous ne pouvez clôturer que votre propre journal de caisse.",
        403
      );
    }

    if (
      journal.statut ===
      StatutJournalCaisse.CLOTURE
    ) {
      throw new AppError(
        "Ce journal de caisse est déjà clôturé.",
        400
      );
    }

    const normalizedObservations =
      observations
        ?.trim() ||
      null;

    if (
      normalizedObservations &&
      normalizedObservations.length >
        500
    ) {
      throw new AppError(
        "Les observations ne peuvent pas dépasser 500 caractères.",
        400
      );
    }

    const closedJournal =
      await this
        .journalCaisseRepository
        .close(
          journalId,
          normalizedObservations
        );

    const totals =
      await this
        .journalCaisseRepository
        .getTotals(
          journalId
        );

    return {
      ...closedJournal,
      totals,
    };
  }
}