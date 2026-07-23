import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import multer from "multer";

import type { Request } from "express";
import type { FileFilterCallback } from "multer";

import { AppError } from "../errors/AppError";

// Dossier dans lequel les documents seront enregistrés
export const demandeUploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "demandes"
);

// Création automatique du dossier s’il n’existe pas
fs.mkdirSync(demandeUploadDirectory, {
  recursive: true,
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
]);

const storage = multer.diskStorage({
  destination: (
    _req,
    _file,
    callback
  ) => {
    callback(null, demandeUploadDirectory);
  },

  filename: (
    _req,
    file,
    callback
  ) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const uniqueFileName =
      `${randomUUID()}${extension}`;

    callback(null, uniqueFileName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const mimeTypeIsValid =
    allowedMimeTypes.has(file.mimetype);

  const extensionIsValid =
    allowedExtensions.has(extension);

  if (!mimeTypeIsValid || !extensionIsValid) {
    return callback(
      new AppError(
        "Format de fichier non autorisé. Seuls les fichiers PDF, JPG, JPEG et PNG sont acceptés.",
        400
      )
    );
  }

  callback(null, true);
};

export const uploadDemandeDocument = multer({
  storage,
  fileFilter,

  limits: {
    // Maximum 5 Mo
    fileSize: 5 * 1024 * 1024,

    // Un seul fichier par requête
    files: 1,
  },
});