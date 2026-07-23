import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../errors/AppError";
import { DemandeDocumentService } from "../services/demande-document.service";
import { ApiResponse } from "../utils/ApiResponse";
import { removeFileIfExists } from "../utils/file";

import {
  uploadDemandeDocumentSchema,
} from "../validations/demande-document.validation";

type DemandeParams = {
  id: string;
};

type DocumentParams = {
  id: string;
  documentId: string;
};

export class DemandeDocumentController {
  private documentService =
    new DemandeDocumentService();

  async upload(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    const file = req.file;

    if (!file) {
      return next(
        new AppError(
          "Le fichier du document est obligatoire.",
          400
        )
      );
    }

    let data;

    try {
      data =
        uploadDemandeDocumentSchema.parse(
          req.body
        );
    } catch (error) {
      await removeFileIfExists(file.path);
      return next(error);
    }

    try {
      const document =
        await this.documentService.upload({
          demandeId: req.params.id,
          utilisateurId:
            req.user!.userId,
          type: data.type,
          file,
        });

      return res.status(201).json(
        ApiResponse.success(
          "Document ajouté avec succès.",
          document
        )
      );
    } catch (error) {
      next(error);
    }
  }

    async download(
    req: Request<DocumentParams>,
    res: Response,
    next: NextFunction
    ) {
    try {
        const downloadInfo =
        await this.documentService.getDownloadInfo(
            req.params.id,
            req.params.documentId
        );

        res.setHeader(
        "Content-Type",
        downloadInfo.mimeType
        );

        return res.download(
        downloadInfo.absolutePath,
        downloadInfo.nomOriginal,
        (error) => {
            if (error && !res.headersSent) {
            next(error);
            }
        }
        );
    } catch (error) {
        next(error);
    }
    }

  async findAll(
    req: Request<DemandeParams>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const documents =
        await this.documentService.findAll(
          req.params.id
        );

      return res.json(
        ApiResponse.success(
          "Documents de la demande récupérés.",
          documents
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: Request<DocumentParams>,
    res: Response,
    next: NextFunction
    ) {
    try {
        await this.documentService.delete(
        req.params.id,
        req.params.documentId
        );

        return res.json(
        ApiResponse.success(
            "Document supprimé avec succès."
        )
        );
    } catch (error) {
        next(error);
    }
    }
}