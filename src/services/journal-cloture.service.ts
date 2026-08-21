import {
  Prisma,
  StatutJournalCloture,
} from "@prisma/client";

import {
  AppError,
} from "../errors/AppError";

import {
  JournalClotureRepository,
} from "../repositories/journal-cloture.repository";

import type {
  CreateJournalClotureDto,
  DeclotureJournalClotureDto,
  ListJournauxClotureDto,
} from "../validations/journal-cloture.validation";

export class JournalClotureService {
  private static readonly PREFIX =
    "JC";

  private journalRepository =
    new JournalClotureRepository();

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

  private assertCanDecloture(
    role: string
  ): void {
    if (role === "ADMIN") {
      return;
    }

    throw new AppError(
      "Seul l’Administrateur peut déclôturer exceptionnellement une journée du guichet.",
      403
    );
  }

  private getTodayInTunisia(): string {
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

  private formatDatabaseDate(
    date: Date
  ): string {
    const year =
      date.getUTCFullYear();

    const month =
      String(
        date.getUTCMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getUTCDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

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

    const databaseDate =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

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
     * Africa/Tunis est actuellement UTC+1.
     * La journée administrative 00:00-24:00
     * correspond donc à 23:00-23:00 UTC.
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

  private async assertNoDemandeEnCours(
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const demandesEnCours =
      await this.journalRepository
        .findDemandesEnCoursForDay(
          startDate,
          endDate
        );

    if (
      demandesEnCours.length === 0
    ) {
      return;
    }

    const numeros =
      demandesEnCours
        .map(
          (demande) =>
            demande.numero
        )
        .join(", ");

    throw new AppError(
      `La journée ne peut pas être clôturée : ${demandesEnCours.length} demande(s) sont encore en cours de contrôle au guichet (${numeros}). Toutes les demandes transmises au Responsable doivent être validées avant la clôture.`,
      409
    );
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

    if (
      existingJournal?.statut ===
      StatutJournalCloture.CLOTURE
    ) {
      throw new AppError(
        "Cette journée a déjà été clôturée.",
        409
      );
    }

    await this.assertNoDemandeEnCours(
      startDate,
      endDate
    );

    return this.journalRepository
      .findEligibleDemandes(
        startDate,
        endDate
      );
  }

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

    if (
      existingJournal?.statut ===
      StatutJournalCloture.CLOTURE
    ) {
      throw new AppError(
        "Cette journée a déjà été clôturée.",
        409
      );
    }

    await this.assertNoDemandeEnCours(
      startDate,
      endDate
    );

    const demandes =
      await this.journalRepository
        .findEligibleDemandes(
          startDate,
          endDate
        );

    const observations =
      data.observations
        ?.trim() || null;

    /*
     * Une journée précédemment déclôturée est reclôturée
     * dans le même journal. Les anciennes demandes restent
     * rattachées et les nouvelles demandes validées sont ajoutées.
     */
    if (
      existingJournal?.statut ===
      StatutJournalCloture.DECLOTUREE
    ) {
      const alreadyLinkedCount =
        existingJournal._count
          .demandes;

      if (
        alreadyLinkedCount === 0 &&
        demandes.length === 0
      ) {
        throw new AppError(
          "Aucune demande validée au niveau du guichet n’est disponible pour cette journée.",
          400
        );
      }

      return this.journalRepository
        .recloseWithDemandes({
          journalId:
            existingJournal.id,
          responsableId,
          observations,
          demandeIds:
            demandes.map(
              (demande) =>
                demande.id
            ),
        });
    }

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
          observations,
          demandeIds:
            demandes.map(
              (demande) =>
                demande.id
            ),
        });
    } catch (error) {
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

  async decloture(
    id: string,
    data: DeclotureJournalClotureDto,
    adminId: string,
    role: string
  ) {
    this.assertCanDecloture(
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

    if (
      journal.statut !==
      StatutJournalCloture.CLOTURE
    ) {
      throw new AppError(
        "Cette journée est déjà déclôturée.",
        409
      );
    }

    const journalDate =
      this.formatDatabaseDate(
        journal.dateJour
      );

    const today =
      this.getTodayInTunisia();

    if (journalDate !== today) {
      throw new AppError(
        "La déclôture est autorisée uniquement le même jour administratif que la clôture.",
        409
      );
    }

    /*
     * Le module Service Étude n'est pas encore développé.
     * Quand il existera, une vérification supplémentaire devra
     * interdire la déclôture si l'étude d'un dossier a commencé.
     */
    return this.journalRepository
      .decloture({
        journalId: id,
        adminId,
        motif:
          data.motif.trim(),
      });
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