import {
  StatutDocument,
} from "@prisma/client";

import { z } from "zod";

export const updateDocumentStatusSchema = z
  .object({
    statut: z.nativeEnum(StatutDocument),

    motifNonConformite: z
      .string()
      .trim()
      .min(
        5,
        "Le motif doit contenir au moins 5 caractères."
      )
      .max(
        500,
        "Le motif ne peut pas dépasser 500 caractères."
      )
      .optional(),
  })
  .superRefine((data, context) => {
    if (data.statut === StatutDocument.DEPOSE) {
      context.addIssue({
        code: "custom",
        path: ["statut"],
        message:
          "Le statut DEPOSE ne peut pas être sélectionné lors de la vérification.",
      });
    }

    if (
      data.statut ===
        StatutDocument.NON_CONFORME &&
      !data.motifNonConformite
    ) {
      context.addIssue({
        code: "custom",
        path: ["motifNonConformite"],
        message:
          "Le motif est obligatoire pour un document non conforme.",
      });
    }
  });

export type UpdateDocumentStatusDto =
  z.infer<typeof updateDocumentStatusSchema>;