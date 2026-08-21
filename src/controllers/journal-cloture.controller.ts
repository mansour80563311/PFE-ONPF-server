import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  JournalClotureService,
} from "../services/journal-cloture.service";

import {
  ApiResponse,
} from "../utils/ApiResponse";

import {
  createJournalClotureSchema,
  declotureJournalClotureSchema,
  listJournauxClotureSchema,
  previewJournalClotureSchema,
} from "../validations/journal-cloture.validation";

type JournalParams = {
  id: string;
};

export class JournalClotureController {
  private journalService =
    new JournalClotureService();

  async preview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        previewJournalClotureSchema
          .parse(
            req.query
          );

      const demandes =
        await this.journalService
          .preview(
            query.dateJour,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Demandes disponibles pour la clôture.",
          demandes
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        createJournalClotureSchema
          .parse(
            req.body
          );

      const journal =
        await this.journalService
          .create(
            data,
            req.user!.userId,
            req.user!.role
          );

      return res
        .status(201)
        .json(
          ApiResponse.success(
            "Journée clôturée avec succès.",
            journal
          )
        );
    } catch (error) {
      next(error);
    }
  }

  async decloture(
    req: Request<JournalParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        declotureJournalClotureSchema
          .parse(
            req.body
          );

      const journal =
        await this.journalService
          .decloture(
            req.params.id,
            data,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Journée du guichet déclôturée avec succès.",
          journal
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findAll(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        listJournauxClotureSchema
          .parse(
            req.query
          );

      const result =
        await this.journalService
          .findAll(
            query,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Liste des journaux de clôture récupérée.",
          result.journaux,
          result.meta
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findById(
    req: Request<JournalParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const journal =
        await this.journalService
          .findById(
            req.params.id,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Journal de clôture récupéré.",
          journal
        )
      );
    } catch (error) {
      next(error);
    }
  }
}