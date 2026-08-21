import {
  StatutJournalCloture,
} from "@prisma/client";

import prisma from "../config/prisma";

import {
  AppError,
} from "../errors/AppError";

/**
 * Service centralisant l'état d'ouverture de la journée du guichet.
 *
 * Une journée est fermée uniquement lorsqu'un JournalCloture existe
 * pour la date courante avec le statut CLOTURE.
 *
 * Un journal DECLOTUREE signifie que l'ADMIN a exceptionnellement
 * rouvert la même journée administrative : les opérations de guichet
 * redeviennent alors possibles.
 *
 * Le paiement complémentaire reste volontairement en dehors de ce
 * verrou, car il correspond au règlement ultérieur d'une dette.
 */
export class GuichetJourneeService {
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
        "Impossible de déterminer la date administrative du guichet.",
        500
      );
    }

    return `${year}-${month}-${day}`;
  }

  private toDatabaseDate(
    dateJour: string
  ): Date {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        dateJour
      );

    if (!match) {
      throw new AppError(
        "La date administrative du guichet est invalide.",
        500
      );
    }

    return new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
    );
  }

  async getClotureJourneeActuelle() {
    const dateJour =
      this.getTodayInTunisia();

    const databaseDate =
      this.toDatabaseDate(
        dateJour
      );

    return prisma.journalCloture.findUnique({
      where: {
        dateJour:
          databaseDate,
      },

      select: {
        id: true,
        numero: true,
        dateJour: true,
        dateCloture: true,
        statut: true,
      },
    });
  }

  async isJourneeCloturee(): Promise<boolean> {
    const journal =
      await this.getClotureJourneeActuelle();

    return (
      journal?.statut ===
      StatutJournalCloture.CLOTURE
    );
  }

  async assertJourneeOuverte(): Promise<void> {
    const journal =
      await this.getClotureJourneeActuelle();

    if (
      !journal ||
      journal.statut ===
        StatutJournalCloture.DECLOTUREE
    ) {
      return;
    }

    throw new AppError(
      `La journée du guichet a déjà été clôturée (${journal.numero}). Aucune nouvelle opération de guichet n’est autorisée pour cette journée.`,
      409
    );
  }
}