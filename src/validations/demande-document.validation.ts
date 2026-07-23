import { TypeDocument } from "@prisma/client";
import { z } from "zod";

export const uploadDemandeDocumentSchema =
  z.object({
    type: z.nativeEnum(TypeDocument, {
      message:
        "Le type de document est invalide.",
    }),
  });

export type UploadDemandeDocumentDto =
  z.infer<
    typeof uploadDemandeDocumentSchema
  >;