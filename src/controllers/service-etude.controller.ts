import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  ServiceEtudeService,
} from "../services/service-etude.service";

import {
  ApiResponse,
} from "../utils/ApiResponse";

import {
  distribuerDossierEtudeSchema,
  dossierEtudeIdParamSchema,
  enregistrerAvisRedacteurSchema,
  enregistrerAvisSuperVerificateurSchema,
  enregistrerAvisVerificateurSchema,
  etudeOperationIdParamSchema,
  listAgentsAffectablesSchema,
  listDemandesADistribuerSchema,
  listDossiersRedacteurSchema,
  listDossiersSuperVerificateurSchema,
  listDossiersVerificateurSchema,
  modifierMinuteSuperVerificateurSchema,
} from "../validations/service-etude.validation";

export class ServiceEtudeController {
  private serviceEtudeService =
    new ServiceEtudeService();

  async findDemandesADistribuer(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        listDemandesADistribuerSchema
          .parse(
            req.query
          );

      const result =
        await this
          .serviceEtudeService
          .findDemandesADistribuer(
            query,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Demandes disponibles pour la distribution récupérées.",
          result.demandes,
          result.meta
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findAgentsAffectables(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        listAgentsAffectablesSchema
          .parse(
            req.query
          );

      const agents =
        await this
          .serviceEtudeService
          .findAgentsAffectables(
            query,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Agents affectables récupérés.",
          agents
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async distribuer(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data =
        distribuerDossierEtudeSchema
          .parse(
            req.body
          );

      const dossier =
        await this
          .serviceEtudeService
          .distribuer(
            data,
            req.user!.userId,
            req.user!.role
          );

      return res
        .status(201)
        .json(
          ApiResponse.success(
            "Demande distribuée au service d’étude avec succès.",
            dossier
          )
        );
    } catch (error) {
      next(error);
    }
  }


  async findDossiersRedacteur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        listDossiersRedacteurSchema
          .parse(
            req.query
          );

      const result =
        await this
          .serviceEtudeService
          .findDossiersRedacteur(
            query,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Dossiers affectés au Rédacteur récupérés.",
          result.dossiers,
          result.meta
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async findDossierRedacteurById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        dossierEtudeIdParamSchema
          .parse(
            req.params
          );

      const dossier =
        await this
          .serviceEtudeService
          .findDossierRedacteurById(
            params.dossierId,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Détail du dossier du Rédacteur récupéré.",
          dossier
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async enregistrerAvisRedacteur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        etudeOperationIdParamSchema
          .parse(
            req.params
          );

      const data =
        enregistrerAvisRedacteurSchema
          .parse(
            req.body
          );

      const result =
        await this
          .serviceEtudeService
          .enregistrerAvisRedacteur(
            params
              .etudeOperationId,
            data,
            req.user!.userId,
            req.user!.role
          );

      return res
        .status(201)
        .json(
          ApiResponse.success(
            "Avis du Rédacteur enregistré sans transmission au Vérificateur.",
            result
          )
        );
    } catch (error) {
      next(error);
    }
  }


  async transmettreOperationRedacteur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        etudeOperationIdParamSchema
          .parse(
            req.params
          );

      const result =
        await this
          .serviceEtudeService
          .transmettreOperationRedacteur(
            params
              .etudeOperationId,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Opération transmise au Vérificateur avec succès.",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async findDossiersVerificateur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        listDossiersVerificateurSchema
          .parse(
            req.query
          );

      const result =
        await this
          .serviceEtudeService
          .findDossiersVerificateur(
            query,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Dossiers affectés au Vérificateur récupérés.",
          result.dossiers,
          result.meta
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async findDossierVerificateurById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        dossierEtudeIdParamSchema
          .parse(
            req.params
          );

      const dossier =
        await this
          .serviceEtudeService
          .findDossierVerificateurById(
            params.dossierId,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Détail du dossier du Vérificateur récupéré.",
          dossier
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async enregistrerAvisVerificateur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        etudeOperationIdParamSchema
          .parse(
            req.params
          );

      const data =
        enregistrerAvisVerificateurSchema
          .parse(
            req.body
          );

      const result =
        await this
          .serviceEtudeService
          .enregistrerAvisVerificateur(
            params
              .etudeOperationId,
            data,
            req.user!.userId,
            req.user!.role
          );

      return res
        .status(201)
        .json(
          ApiResponse.success(
            "Avis du Vérificateur enregistré.",
            result
          )
        );
    } catch (error) {
      next(error);
    }
  }


  async transmettreOperationVerificateurAuSuper(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        etudeOperationIdParamSchema
          .parse(
            req.params
          );

      const result =
        await this
          .serviceEtudeService
          .transmettreOperationVerificateurAuSuper(
            params
              .etudeOperationId,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Opération transmise au Super-vérificateur avec succès.",
          result
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async findDossiersSuperVerificateur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query =
        listDossiersSuperVerificateurSchema
          .parse(
            req.query
          );

      const result =
        await this
          .serviceEtudeService
          .findDossiersSuperVerificateur(
            query,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Dossiers affectés au Super-vérificateur récupérés.",
          result.dossiers,
          result.meta
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async findDossierSuperVerificateurById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        dossierEtudeIdParamSchema.parse(req.params);

      const dossier =
        await this.serviceEtudeService
          .findDossierSuperVerificateurById(
            params.dossierId,
            req.user!.userId,
            req.user!.role
          );

      return res.json(
        ApiResponse.success(
          "Détail du dossier du Super-vérificateur récupéré.",
          dossier
        )
      );
    } catch (error) {
      next(error);
    }
  }


  async enregistrerAvisSuperVerificateur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        etudeOperationIdParamSchema
          .parse(
            req.params
          );

      const data =
        enregistrerAvisSuperVerificateurSchema
          .parse(
            req.body
          );

      const result =
        await this
          .serviceEtudeService
          .enregistrerAvisSuperVerificateur(
            params
              .etudeOperationId,
            data,
            req.user!.userId,
            req.user!.role
          );

      return res
        .status(201)
        .json(
          ApiResponse.success(
            "Avis du Super-vérificateur enregistré sans finalisation.",
            result
          )
        );
    } catch (error) {
      next(error);
    }
  }


  async modifierMinuteSuperVerificateur(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const params =
        etudeOperationIdParamSchema
          .parse(
            req.params
          );

      const data =
        modifierMinuteSuperVerificateurSchema
          .parse(
            req.body
          );

      const result =
        await this
          .serviceEtudeService
          .modifierMinuteSuperVerificateur(
            params
              .etudeOperationId,
            data,
            req.user!.userId,
            req.user!.role
          );

      return res
        .status(201)
        .json(
          ApiResponse.success(
            "Nouvelle version de la minute enregistrée par le Super-vérificateur.",
            result
          )
        );
    } catch (error) {
      next(error);
    }
  }

}
