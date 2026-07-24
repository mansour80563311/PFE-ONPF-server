import { AppError } from "../errors/AppError";
import { JournalClotureRepository } from "../repositories/journal-cloture.repository";

import type {
  CreateJournalClotureDto,
  ListJournauxClotureDto,
} from "../validations/journal-cloture.validation";

export class JournalClotureService {
  private static readonly PREFIX = "JC";

  private journalRepository =
    new JournalClotureRepository();

  private getDateRange(dateJour: string) {
    /*
     * Journée administrative tunisienne :
     * UTC+1.
     */
    const startDate = new Date(
      `${dateJour}T00:00:00+01:00`
    );

    if (Number.isNaN(startDate.getTime())) {
      throw new AppError(
        "La date de clôture est invalide.",
        400
      );
    }

    const endDate = new Date(
      startDate.getTime() +
        24 * 60 * 60 * 1000
    );

    /*
     * La colonne dateJour est de type PostgreSQL DATE.
     * On stocke donc la date à minuit UTC.
     */
    const databaseDate = new Date(
      `${dateJour}T00:00:00.000Z`
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
        .findLastNumeroByYear(year);

    if (!lastJournal) {
      return `${JournalClotureService.PREFIX}-${year}-000001`;
    }

    const parts =
      lastJournal.numero.split("-");

    const lastNumber = Number(parts[2]);

    if (Number.isNaN(lastNumber)) {
      throw new AppError(
        "Le numéro du dernier journal de clôture est invalide.",
        500
      );
    }

    const nextNumber = String(
      lastNumber + 1
    ).padStart(6, "0");

    return `${JournalClotureService.PREFIX}-${year}-${nextNumber}`;
  }

  async preview(dateJour: string) {
    const {
      startDate,
      endDate,
      databaseDate,
    } = this.getDateRange(dateJour);

    const existingJournal =
      await this.journalRepository.findByDate(
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

  async create(
    data: CreateJournalClotureDto,
    responsableId: string
  ) {
    const {
      startDate,
      endDate,
      databaseDate,
    } = this.getDateRange(data.dateJour);

    const existingJournal =
      await this.journalRepository.findByDate(
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

    if (demandes.length === 0) {
      throw new AppError(
        "Aucune demande finalisée n’est disponible pour cette journée.",
        400
      );
    }

    const year =
      databaseDate.getUTCFullYear();

    const numero =
      await this.generateNumero(year);

    return this.journalRepository
      .createWithDemandes({
        numero,
        dateJour: databaseDate,
        responsableId,
        observations:
          data.observations?.trim() || null,
        demandeIds: demandes.map(
          (demande) => demande.id
        ),
      });
  }

  async findAll(
    query: ListJournauxClotureDto
    ) {
    const {
        page,
        limit,
        search,
    } = query;

    const result =
        await this.journalRepository.findAll(
        page,
        limit,
        search
        );

    return {
        journaux: result.data,

        meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages:
            result.totalPages,
        },
    };
    }

    async findById(id: string) {
    const journal =
        await this.journalRepository.findById(
        id
        );

    if (!journal) {
        throw new AppError(
        "Journal de clôture introuvable.",
        404
        );
    }

    return journal;
    }
}