import { z } from "zod";

const dateJourSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "La date doit respecter le format AAAA-MM-JJ."
  )
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(date.getTime());
  }, "La date renseignée est invalide.");

export const previewJournalClotureSchema =
  z.object({
    dateJour: dateJourSchema,
  });

export const createJournalClotureSchema =
  z.object({
    dateJour: dateJourSchema,

    observations: z
      .string()
      .trim()
      .max(
        500,
        "Les observations ne peuvent pas dépasser 500 caractères."
      )
      .optional()
      .or(z.literal("")),
  });

export type PreviewJournalClotureDto =
  z.infer<typeof previewJournalClotureSchema>;

export type CreateJournalClotureDto =
  z.infer<typeof createJournalClotureSchema>;


export const listJournauxClotureSchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),

    search: z
      .string()
      .trim()
      .optional(),
  });

export type ListJournauxClotureDto =
  z.infer<
    typeof listJournauxClotureSchema
  >;