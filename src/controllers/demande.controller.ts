import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  DemandeService,
} from "../services/demande.service";

import {
  DemandeDocumentService,
} from "../services/demande-document.service";

import {
  RecapitulatifDemandeService,
} from "../services/recapitulatif-demande.service";

import {
  ResponsableDemandeService,
} from "../services/responsable-demande.service";

import {
  ApiResponse,
} from "../utils/ApiResponse";

import {
  createDemandeSchema,
  listDemandesSchema,
  updateDemandeSchema,
  updateDemandeStatusSchema,
} from "../validations/demande.validation";

import {
  corrigerDemandeResponsableSchema,
} from "../validations/responsable-demande.validation";

type DemandeParams = {
  id: string;
};

export class DemandeController {
  private demandeService =
    new DemandeService();

  private demandeDocumentService =
    new DemandeDocumentService();

  private recapitulatifDemandeService =
    new RecapitulatifDemandeService();

  private responsableDemandeService =
    new ResponsableDemandeService();

  async findAll(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        listDemandesSchema.parse(
          req.query
        );

      const result =
        await this.demandeService
          .findAll(
            query,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Liste des demandes récupérée.",
          result.demandes,
          result.meta
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findById(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const demande =
        await this.demandeService
          .findById(
            req.params.id,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Demande récupérée.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async generateRecapitulatif(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const demande =
        await this.demandeService
          .findById(
            req.params.id,
            req.user!.userId,
            req.user!.role
          );

      const documents =
        await this.demandeDocumentService
          .findAll(
            req.params.id,
            req.user!.userId,
            req.user!.role
          );

      const pdfBuffer =
        await this
          .recapitulatifDemandeService
          .generate(
            demande,
            documents
          );

      const safeNumero =
        demande.numero.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="demande-service-${safeNumero}.pdf"`
      );

      res.setHeader(
        "Content-Length",
        String(
          pdfBuffer.length
        )
      );

      return res.send(
        pdfBuffer
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Correction métier d'une demande déjà payée
   * pendant le contrôle du Responsable Guichet.
   *
   * Le service conserve le paiement initial et
   * la tarification initiale figée. Une éventuelle
   * hausse est enregistrée sous forme de complément.
   */
  async corrigerParResponsable(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        corrigerDemandeResponsableSchema
          .parse(req.body);

      const result =
        await this
          .responsableDemandeService
          .corrigerInscription(
            req.params.id,
            data,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          result.resumeTarification
            .complementRequis
            ? "Correction enregistrée. Un complément de paiement est requis."
            : "Correction enregistrée sans complément de paiement.",
          result
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
        createDemandeSchema.parse(
          req.body
        );

      const demande =
        await this.demandeService
          .create(
            {
              ...data,

              utilisateurId:
                req.user!.userId,
            },

            req.user!.role
          );

      return res.status(201).json(
        ApiResponse.success(
          "Demande créée avec succès.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        updateDemandeSchema.parse(
          req.body
        );

      const demande =
        await this.demandeService
          .update(
            req.params.id,
            data,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Demande mise à jour.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async verifierCni(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const demande =
        await this.demandeService
          .verifierCni(
            req.params.id,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Identité CNI vérifiée et demande mise à jour avec succès.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        updateDemandeStatusSchema
          .parse(req.body);

      const demande =
        await this.demandeService
          .updateStatus(
            req.params.id,
            data.statut,
            req.user!.userId,
            req.user!.role,
            data.motifRejet
          );

      return res.json(
        ApiResponse.success(
          "Statut de la demande mis à jour avec succès.",
          demande
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      await this.demandeService
        .delete(
          req.params.id,
          req.user!.userId,
          req.user!.role
        );

      return res.json(
        ApiResponse.success(
          "Demande supprimée."
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findHistory(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const historique =
        await this.demandeService
          .findHistory(
            req.params.id,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Historique de la demande récupéré.",
          historique
        )
      );
    } catch (error) {
      next(error);
    }
  }
}