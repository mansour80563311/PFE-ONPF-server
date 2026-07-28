import fs from "node:fs/promises";
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

interface UploadDocumentParams {
  demandeId: string;
  utilisateurId: string;
  role: string;
  type: TypeDocument;
  file: Express.Multer.File;
}

interface DemandeAccessData {
  utilisateurId: string;
  statut: StatutDemande;
}

export class DemandeDocumentService {
  private demandeRepository =
    new DemandeRepository();

  private documentRepository =
    new DemandeDocumentRepository();

    /**
   * Contrôle l’accès en lecture aux documents
   * d’une demande.
   *
   * ADMIN :
   * accès à toutes les demandes.
   *
   * AGENT :
   * accès uniquement à ses propres demandes.
   *
   * RESPONSABLE :
   * accès aux demandes EN_COURS, VALIDEE
   * ou REJETEE, mais jamais EN_ATTENTE.
   */
  private assertCanReadDocuments(
    demande: DemandeAccessData,
    utilisateurId: string,
    role: string
  ): void {
    if (role === "ADMIN") {
      return;
    }

    if (
      role === "AGENT" &&
      demande.utilisateurId ===
        utilisateurId
    ) {
      return;
    }

    if (
      role === "RESPONSABLE" &&
      demande.statut !==
        StatutDemande.EN_ATTENTE
    ) {
      return;
    }

    throw new AppError(
      "Vous n’êtes pas autorisé à consulter les documents de cette demande.",
      403
    );
  }

  /**
   * Ajouter une pièce justificative.
   *
   * ADMIN :
   * peut ajouter une pièce à une demande EN_ATTENTE.
   *
   * AGENT :
   * peut ajouter une pièce uniquement à sa propre
   * demande et uniquement lorsqu’elle est EN_ATTENTE.
   *
   * RESPONSABLE :
   * ne peut pas ajouter de pièce.
   */
  async upload({
    demandeId,
    utilisateurId,
    role,
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

      const isAdmin =
        role === "ADMIN";

      const isAgent =
        role === "AGENT";

      if (!isAdmin && !isAgent) {
        throw new AppError(
          "Seul un agent peut ajouter des documents à une demande.",
          403
        );
      }

      if (
        demande.statut !==
        StatutDemande.EN_ATTENTE
      ) {
        throw new AppError(
          "Les documents ne peuvent être ajoutés que lorsque la demande est en attente.",
          400
        );
      }

      if (
        isAgent &&
        demande.utilisateurId !==
          utilisateurId
      ) {
        throw new AppError(
          "Vous ne pouvez ajouter des documents qu’à vos propres demandes.",
          403
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
            .findIdentityDocument(
              demandeId
            );

        if (existingIdentityDocument) {
          throw new AppError(
            "Une pièce d’identité, CIN ou passeport, existe déjà pour cette demande.",
            409
          );
        }
      }

      const relativePath = path
        .relative(
          process.cwd(),
          file.path
        )
        .split(path.sep)
        .join("/");

      return await this.documentRepository
        .create({
          type,

          nomOriginal:
            file.originalname,

          nomStockage:
            file.filename,

          cheminFichier:
            relativePath,

          mimeType:
            file.mimetype,

          taille:
            file.size,

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
      /*
       * Multer a déjà enregistré le fichier.
       * En cas d’erreur métier ou technique,
       * le fichier physique est supprimé.
       */
      await removeFileIfExists(
        file.path
      );

      throw error;
    }
  }

  /**
   * Préparer le téléchargement d’un document
   * après vérification des autorisations.
   */
  async getDownloadInfo(
    demandeId: string,
    documentId: string,
    utilisateurId: string,
    role: string
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

    this.assertCanReadDocuments(
      demande,
      utilisateurId,
      role
    );

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
      nomOriginal:
        document.nomOriginal,
      mimeType:
        document.mimeType,
    };
  }

  /**
   * Récupérer les documents d’une demande
   * après vérification des autorisations.
   */
  async findAll(
    demandeId: string,
    utilisateurId: string,
    role: string
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

    this.assertCanReadDocuments(
      demande,
      utilisateurId,
      role
    );

    return this.documentRepository
      .findAllByDemandeId(
        demandeId
      );
  }

  /**
   * Vérifier la conformité d’un document.
   *
   * ADMIN ou RESPONSABLE uniquement.
   *
   * La demande doit obligatoirement être
   * au statut EN_COURS.
   */
  async updateStatus(
    demandeId: string,
    documentId: string,
    statut: StatutDocument,
    role: string,
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

    const isAdmin =
      role === "ADMIN";

    const isResponsable =
      role === "RESPONSABLE";

    if (
      !isAdmin &&
      !isResponsable
    ) {
      throw new AppError(
        "Seul un responsable peut vérifier la conformité des documents.",
        403
      );
    }

    if (
      demande.statut !==
      StatutDemande.EN_COURS
    ) {
      throw new AppError(
        "La conformité des documents ne peut être vérifiée que lorsque la demande est en cours.",
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
      statut !==
        StatutDocument.CONFORME &&
      statut !==
        StatutDocument.NON_CONFORME
    ) {
      throw new AppError(
        "Le nouveau statut du document est invalide.",
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

    if (
      statut ===
        StatutDocument.NON_CONFORME &&
      motifNonConformite!.trim()
        .length < 5
    ) {
      throw new AppError(
        "Le motif de non-conformité doit contenir au moins 5 caractères.",
        400
      );
    }

    return this.documentRepository
      .updateStatus(
        documentId,
        statut,
        statut ===
          StatutDocument.NON_CONFORME
          ? motifNonConformite!.trim()
          : null
      );
  }

  /**
   * Supprimer une pièce justificative.
   *
   * ADMIN :
   * peut supprimer une pièce d’une demande
   * EN_ATTENTE.
   *
   * AGENT :
   * peut supprimer une pièce uniquement sur
   * sa propre demande EN_ATTENTE.
   */
  async delete(
    demandeId: string,
    documentId: string,
    utilisateurId: string,
    role: string
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

    const isAdmin =
      role === "ADMIN";

    const isAgent =
      role === "AGENT";

    if (!isAdmin && !isAgent) {
      throw new AppError(
        "Seul un agent peut supprimer les documents d’une demande.",
        403
      );
    }

    if (
      demande.statut !==
      StatutDemande.EN_ATTENTE
    ) {
      throw new AppError(
        "Les documents ne peuvent être supprimés que lorsque la demande est en attente.",
        400
      );
    }

    if (
      isAgent &&
      demande.utilisateurId !==
        utilisateurId
    ) {
      throw new AppError(
        "Vous ne pouvez supprimer que les documents de vos propres demandes.",
        403
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

    /*
     * On supprime d’abord l’enregistrement
     * en base de données.
     */
    await this.documentRepository.delete(
      documentId
    );

    /*
     * Puis on supprime le fichier physique.
     * La fonction ne génère pas d’erreur si
     * le fichier n’existe déjà plus.
     */
    await removeFileIfExists(
      absolutePath
    );
  }
}