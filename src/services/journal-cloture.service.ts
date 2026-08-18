import {
  Prisma,
} from "@prisma/client";

import {
  AppError,
} from "../errors/AppError";

import {
  JournalClotureRepository,
} from "../repositories/journal-cloture.repository";

import type {
  CreateJournalClotureDto,
  ListJournauxClotureDto,
} from "../validations/journal-cloture.validation";

export class JournalClotureService {
  private static readonly PREFIX =
    "JC";

  private journalRepository =
    new JournalClotureRepository();

  /**
   * Protection complémentaire au
   * roleMiddleware des routes.
   *
   * Le Responsable assure normalement
   * la clôture du guichet.
   *
   * L'Administrateur conserve pour le
   * moment son droit de supervision.
   */
  private assertCanAccessJournaux(
    role: string
  ): void {
    if (
      role === "ADMIN" ||
      role === "RESPONSABLE"
    ) {
      return;
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à accéder aux journaux de clôture.",
      403
    );
  }

  /**
   * Retourne la date actuelle en Tunisie
   * au format YYYY-MM-DD.
   */
  private getTodayInTunisia():
    string {
    const parts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: "Africa/Tunis",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).formatToParts(
        new Date()
      );

    const year =
      parts.find(
        (part) =>
          part.type === "year"
      )?.value;

    const month =
      parts.find(
        (part) =>
          part.type === "month"
      )?.value;

    const day =
      parts.find(
        (part) =>
          part.type === "day"
      )?.value;

    if (
      !year ||
      !month ||
      !day
    ) {
      throw new AppError(
        "Impossible de déterminer la date actuelle.",
        500
      );
    }

    return `${year}-${month}-${day}`;
  }

  /**
   * Vérifie strictement la date puis calcule
   * les bornes correspondant à la journée
   * administrative tunisienne UTC+1.
   */
  private getDateRange(
    dateJour: string
  ) {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        dateJour
      );

    if (!match) {
      throw new AppError(
        "La date de clôture est invalide.",
        400
      );
    }

    const year =
      Number(match[1]);

    const month =
      Number(match[2]);

    const day =
      Number(match[3]);

    /*
     * La colonne PostgreSQL dateJour est
     * enregistrée comme une DATE à minuit UTC.
     */
    const databaseDate =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    /*
     * Empêche les dates telles que
     * 2026-02-31 d’être automatiquement
     * transformées en une date de mars.
     */
    const isValidCalendarDate =
      databaseDate.getUTCFullYear() ===
        year &&
      databaseDate.getUTCMonth() ===
        month - 1 &&
      databaseDate.getUTCDate() ===
        day;

    if (!isValidCalendarDate) {
      throw new AppError(
        "La date de clôture est invalide.",
        400
      );
    }

    const today =
      this.getTodayInTunisia();

    if (dateJour > today) {
      throw new AppError(
        "Une journée future ne peut pas être clôturée.",
        400
      );
    }

    /*
     * Minuit en Tunisie correspond à
     * 23 heures UTC la veille.
     */
    const startDate =
      new Date(
        databaseDate.getTime() -
          60 * 60 * 1000
      );

    const endDate =
      new Date(
        startDate.getTime() +
          24 * 60 * 60 * 1000
      );

    return {
      startDate,
      endDate,
      databaseDate,
    };
  }

  private async generateNumero(
    year: number
  ): Promise<string> {
    const lastJournal =
      await this.journalRepository
        .findLastNumeroByYear(
          year
        );

    if (!lastJournal) {
      return `${JournalClotureService.PREFIX}-${year}-000001`;
    }

    const parts =
      lastJournal.numero.split("-");

    const lastNumber =
      Number(parts[2]);

    if (
      Number.isNaN(lastNumber)
    ) {
      throw new AppError(
        "Le numéro du dernier journal de clôture est invalide.",
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

    return `${JournalClotureService.PREFIX}-${year}-${nextNumber}`;
  }

  /**
   * Prévisualise les demandes validées au
   * niveau du guichet pendant la journée.
   *
   * Une demande déjà rattachée à un journal
   * ne peut plus être sélectionnée.
   */
  async preview(
    dateJour: string,
    role: string
  ) {
    this.assertCanAccessJournaux(
      role
    );

    const {
      startDate,
      endDate,
      databaseDate,
    } = this.getDateRange(
      dateJour
    );

    const existingJournal =
      await this.journalRepository
        .findByDate(
          databaseDate
        );

    if (existingJournal) {
      throw new AppError(
        "Cette journée a déjà été clôturée.",
        409
      );
    }

    return this.journalRepository
      .findEligibleDemandes(
        startDate,
        endDate
      );
  }

  /**
   * Clôture la journée du guichet.
   *
   * Toutes les demandes validées au niveau
   * du guichet pendant cette journée et
   * encore non clôturées sont rattachées au
   * même journal.
   *
   * Le complément de paiement éventuel
   * n'intervient pas dans l'éligibilité :
   * une dette peut rester à régler avant
   * la délivrance finale du résultat.
   */
  async create(
    data: CreateJournalClotureDto,
    responsableId: string,
    role: string
  ) {
    this.assertCanAccessJournaux(
      role
    );

    const {
      startDate,
      endDate,
      databaseDate,
    } = this.getDateRange(
      data.dateJour
    );

    const existingJournal =
      await this.journalRepository
        .findByDate(
          databaseDate
        );

    if (existingJournal) {
      throw new AppError(
        "Cette journée a déjà été clôturée.",
        409
      );
    }

    const demandes =
      await this.journalRepository
        .findEligibleDemandes(
          startDate,
          endDate
        );

    if (
      demandes.length === 0
    ) {
      throw new AppError(
        "Aucune demande validée au niveau du guichet n’est disponible pour cette journée.",
        400
      );
    }

    const year =
      databaseDate
        .getUTCFullYear();

    const numero =
      await this.generateNumero(
        year
      );

    try {
      return await this
        .journalRepository
        .createWithDemandes({
          numero,
          dateJour:
            databaseDate,
          responsableId,

          observations:
            data.observations
              ?.trim() || null,

          demandeIds:
            demandes.map(
              (demande) =>
                demande.id
            ),
        });
    } catch (error) {
      /*
       * Cette erreur peut apparaître lorsque
       * deux utilisateurs tentent de clôturer
       * la même journée simultanément ou
       * génèrent le même numéro.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Cette journée vient déjà d’être clôturée par un autre utilisateur. Actualisez la liste des journaux.",
          409
        );
      }

      throw error;
    }
  }

  async findAll(
    query:
      ListJournauxClotureDto,
    role: string
  ) {
    this.assertCanAccessJournaux(
      role
    );

    const {
      page,
      limit,
      search,
    } = query;

    const result =
      await this.journalRepository
        .findAll(
          page,
          limit,
          search
        );

    return {
      journaux:
        result.data,

      meta: {
        total:
          result.total,

        page:
          result.page,

        limit:
          result.limit,

        totalPages:
          result.totalPages,
      },
    };
  }

  async findById(
    id: string,
    role: string
  ) {
    this.assertCanAccessJournaux(
      role
    );

    const journal =
      await this.journalRepository
        .findById(id);

    if (!journal) {
      throw new AppError(
        "Journal de clôture introuvable.",
        404
      );
    }

    return journal;
  }
}