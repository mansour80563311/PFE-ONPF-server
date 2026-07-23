import path from "node:path";

import {
  StatutDemande,
  StatutDocument,
  TypeDocument,
} from "@prisma/client";

import { AppError } from "../errors/AppError";
import { DemandeRepository } from "../repositories/demande.repository";
import { DemandeDocumentRepository } from "../repositories/demande-document.repository";
import { removeFileIfExists } from "../utils/file";
import fs from "node:fs/promises";

interface UploadDocumentParams {
  demandeId: string;
  utilisateurId: string;
  type: TypeDocument;
  file: Express.Multer.File;
}

export class DemandeDocumentService {
  private demandeRepository =
    new DemandeRepository();

  private documentRepository =
    new DemandeDocumentRepository();

  async upload({
    demandeId,
    utilisateurId,
    type,
    file,
  }: UploadDocumentParams) {
    try {
      const demande =
        await this.demandeRepository.findById(
          demandeId
        );

      if (!demande) {
        throw new AppError(
          "Demande introuvable.",
          404
        );
      }

      if (
        demande.statut ===
          StatutDemande.VALIDEE ||
        demande.statut ===
          StatutDemande.REJETEE
      ) {
        throw new AppError(
          "Impossible d’ajouter un document à une demande terminée.",
          400
        );
      }

      const existingDocument =
        await this.documentRepository
          .findByDemandeAndType(
            demandeId,
            type
          );

      if (existingDocument) {
        throw new AppError(
          "Ce type de document a déjà été ajouté à cette demande.",
          409
        );
      }

      const isIdentityDocument =
        type === TypeDocument.CIN ||
        type === TypeDocument.PASSEPORT;

      if (isIdentityDocument) {
        const existingIdentityDocument =
          await this.documentRepository
            .findIdentityDocument(demandeId);

        if (existingIdentityDocument) {
          throw new AppError(
            "Une pièce d’identité, CIN ou passeport, existe déjà pour cette demande.",
            409
          );
        }
      }

      const relativePath = path
        .relative(process.cwd(), file.path)
        .split(path.sep)
        .join("/");

      return await this.documentRepository.create({
        type,

        nomOriginal: file.originalname,
        nomStockage: file.filename,
        cheminFichier: relativePath,
        mimeType: file.mimetype,
        taille: file.size,

        demande: {
          connect: {
            id: demandeId,
          },
        },

        utilisateur: {
          connect: {
            id: utilisateurId,
          },
        },
      });
    } catch (error) {
      await removeFileIfExists(file.path);
      throw error;
    }
  }

    async getDownloadInfo(
    demandeId: string,
    documentId: string
    ) {
    const demande =
        await this.demandeRepository.findById(
        demandeId
        );

    if (!demande) {
        throw new AppError(
        "Demande introuvable.",
        404
        );
    }

    const document =
        await this.documentRepository.findById(
        documentId
        );

    if (
        !document ||
        document.demandeId !== demandeId
    ) {
        throw new AppError(
        "Document introuvable pour cette demande.",
        404
        );
    }

    const absolutePath = path.resolve(
        process.cwd(),
        document.cheminFichier
    );

    try {
        await fs.access(absolutePath);
    } catch {
        throw new AppError(
        "Le fichier associé à ce document est introuvable sur le serveur.",
        404
        );
    }

    return {
        absolutePath,
        nomOriginal: document.nomOriginal,
        mimeType: document.mimeType,
    };
    }

  async findAll(demandeId: string) {
    const demande =
      await this.demandeRepository.findById(
        demandeId
      );

    if (!demande) {
      throw new AppError(
        "Demande introuvable.",
        404
      );
    }

    return this.documentRepository
      .findAllByDemandeId(demandeId);
  }

  async updateStatus(
    demandeId: string,
    documentId: string,
    statut: StatutDocument,
    motifNonConformite?: string
  ) {
    const demande =
      await this.demandeRepository.findById(
        demandeId
      );

    if (!demande) {
      throw new AppError(
        "Demande introuvable.",
        404
      );
    }

    if (
      demande.statut ===
        StatutDemande.VALIDEE ||
      demande.statut ===
        StatutDemande.REJETEE
    ) {
      throw new AppError(
        "Impossible de vérifier un document appartenant à une demande terminée.",
        400
      );
    }

    const document =
      await this.documentRepository.findById(
        documentId
      );

    if (
      !document ||
      document.demandeId !== demandeId
    ) {
      throw new AppError(
        "Document introuvable pour cette demande.",
        404
      );
    }

    if (
      document.statut !==
      StatutDocument.DEPOSE
    ) {
      throw new AppError(
        "Ce document a déjà été vérifié.",
        400
      );
    }

    if (
      statut ===
        StatutDocument.NON_CONFORME &&
      !motifNonConformite?.trim()
    ) {
      throw new AppError(
        "Le motif de non-conformité est obligatoire.",
        400
      );
    }

    return this.documentRepository.updateStatus(
      documentId,
      statut,
      statut === StatutDocument.NON_CONFORME
        ? motifNonConformite!.trim()
        : null
    );
  }

  async delete(
    demandeId: string,
    documentId: string
    ) {
    const demande =
        await this.demandeRepository.findById(
        demandeId
        );

    if (!demande) {
        throw new AppError(
        "Demande introuvable.",
        404
        );
    }

    if (
        demande.statut === StatutDemande.VALIDEE ||
        demande.statut === StatutDemande.REJETEE
    ) {
        throw new AppError(
        "Impossible de supprimer un document d’une demande terminée.",
        400
        );
    }

    const document =
        await this.documentRepository.findById(
        documentId
        );

    if (
        !document ||
        document.demandeId !== demandeId
    ) {
        throw new AppError(
        "Document introuvable pour cette demande.",
        404
        );
    }

    const absolutePath = path.resolve(
        process.cwd(),
        document.cheminFichier
    );

    await this.documentRepository.delete(
        documentId
    );

    await removeFileIfExists(absolutePath);
    }
}