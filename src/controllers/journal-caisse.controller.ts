import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  JournalCaisseService,
} from "../services/journal-caisse.service";

import {
  ApiResponse,
} from "../utils/ApiResponse";

import {
  closeJournalCaisseSchema,
} from "../validations/journal-caisse.validation";

const journalCaisseService =
  new JournalCaisseService();

export class JournalCaisseController {
  /**
   * Liste les journaux de caisse.
   *
   * GET /api/journaux-caisse
   *
   * CAISSIER :
   * uniquement ses propres journaux.
   *
   * ADMIN et RESPONSABLE :
   * tous les journaux.
   */
  async findAll(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponse.error(
            "Non authentifié."
          )
        );
      }

      const rawPage =
        Array.isArray(
          req.query.page
        )
          ? req.query.page[0]
          : req.query.page;

      const rawLimit =
        Array.isArray(
          req.query.limit
        )
          ? req.query.limit[0]
          : req.query.limit;

      const page =
        Number(
          rawPage ?? 1
        );

      const limit =
        Number(
          rawLimit ?? 10
        );

      const result =
        await journalCaisseService
          .findAll(
            page,
            limit,
            req.user.userId,
            req.user.role
          );

      return res.status(200).json({
        success: true,

        message:
          "Journaux de caisse récupérés avec succès.",

        data:
          result.data,

        meta: {
          page:
            result.page,

          limit:
            result.limit,

          total:
            result.total,

          totalPages:
            result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Consulte le journal du jour.
   *
   * GET /api/journaux-caisse/du-jour
   *
   * Pour un Caissier, son identifiant est
   * automatiquement utilisé.
   *
   * Pour un Administrateur ou un Responsable :
   *
   * GET /api/journaux-caisse/du-jour
   *     ?caissierId=IDENTIFIANT
   */
  async findJournalDuJour(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponse.error(
            "Non authentifié."
          )
        );
      }

      const rawCaissierId =
        Array.isArray(
          req.query.caissierId
        )
          ? req.query.caissierId[0]
          : req.query.caissierId;

      const caissierId =
        typeof rawCaissierId ===
        "string"
          ? rawCaissierId
          : undefined;

      const journal =
        await journalCaisseService
          .findJournalDuJour(
            req.user.userId,
            req.user.role,
            caissierId
          );

      return res.status(200).json(
        ApiResponse.success(
          "Journal de caisse du jour récupéré avec succès.",
          journal
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Consulte un journal par son identifiant.
   *
   * GET /api/journaux-caisse/:id
   */
  async findById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponse.error(
            "Non authentifié."
          )
        );
      }

      const journalId =
        String(
          req.params.id
        );

      const journal =
        await journalCaisseService
          .findById(
            journalId,
            req.user.userId,
            req.user.role
          );

      return res.status(200).json(
        ApiResponse.success(
          "Journal de caisse récupéré avec succès.",
          journal
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clôture un journal de caisse.
   *
   * PATCH /api/journaux-caisse/:id/cloturer
   *
   * CAISSIER :
   * clôture uniquement son propre journal.
   *
   * ADMIN :
   * peut clôturer tous les journaux.
   *
   * RESPONSABLE :
   * lecture seule.
   */
  async close(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json(
          ApiResponse.error(
            "Non authentifié."
          )
        );
      }

      const journalId =
        String(
          req.params.id
        );

      const data =
        closeJournalCaisseSchema
          .parse(
            req.body
          );

      const journal =
        await journalCaisseService
          .close(
            journalId,
            req.user.userId,
            req.user.role,
            data.observations ||
              undefined
          );

      return res.status(200).json(
        ApiResponse.success(
          "Journal de caisse clôturé avec succès.",
          journal
        )
      );
    } catch (error) {
      next(error);
    }
  }
}