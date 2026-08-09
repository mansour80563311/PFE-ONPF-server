import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  PaiementService,
} from "../services/paiement.service";

import {
  RecuPaiementService,
} from "../services/recu-paiement.service";

import {
  ApiResponse,
} from "../utils/ApiResponse";

import {
  createPaiementSchema,
} from "../validations/paiement.validation";

const paiementService =
  new PaiementService();

const recuPaiementService =
  new RecuPaiementService();

export class PaiementController {
  /**
   * Enregistre le paiement d’une demande.
   *
   * POST /api/demandes/:demandeId/paiement
   */
  async create(
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

      const demandeId =
        String(
          req.params.demandeId
        );

      const data =
        createPaiementSchema.parse(
          req.body
        );

      const paiement =
        await paiementService.create(
          demandeId,
          data,
          req.user.userId,
          req.user.role
        );

      return res.status(201).json(
        ApiResponse.success(
          "Paiement enregistré avec succès.",
          paiement
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Consulte le paiement associé
   * à une demande.
   *
   * GET /api/demandes/:demandeId/paiement
   */
  async findByDemandeId(
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

      const demandeId =
        String(
          req.params.demandeId
        );

      const paiement =
        await paiementService
          .findByDemandeId(
            demandeId,
            req.user.userId,
            req.user.role
          );

      return res.status(200).json(
        ApiResponse.success(
          "Paiement récupéré avec succès.",
          paiement
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Consulte directement un paiement
   * à partir de son identifiant.
   *
   * GET /api/paiements/:id
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

      const paiementId =
        String(
          req.params.id
        );

      const paiement =
        await paiementService
          .findById(
            paiementId,
            req.user.role
          );

      return res.status(200).json(
        ApiResponse.success(
          "Paiement récupéré avec succès.",
          paiement
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Génère le reçu PDF d’un paiement.
   *
   * Le PDF est envoyé directement dans
   * la réponse HTTP et ouvert dans le
   * navigateur.
   *
   * GET /api/paiements/:id/recu
   */
  async generateRecu(
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

      const paiementId =
        String(
          req.params.id
        );

      /*
       * Cette méthode vérifie également
       * que le rôle est ADMIN ou CAISSIER.
       */
      const paiement =
        await paiementService
          .findById(
            paiementId,
            req.user.role
          );

      const pdfBuffer =
        await recuPaiementService
          .generate(
            paiement
          );

      const safeNumeroRecu =
        paiement.numeroRecu.replace(
          /[^a-zA-Z0-9-_]/g,
          "_"
        );

      const filename =
        `recu-${safeNumeroRecu}.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      /*
       * inline permet au navigateur
       * d’ouvrir le reçu directement.
       */
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${filename}"`
      );

      res.setHeader(
        "Content-Length",
        String(
          pdfBuffer.length
        )
      );

      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      return res
        .status(200)
        .send(
          pdfBuffer
        );
    } catch (error) {
      next(error);
    }
  }
}