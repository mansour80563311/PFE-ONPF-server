import {
  z,
} from "zod";

export const closeJournalCaisseSchema =
  z.object({
    observations:
      z
        .string()
        .trim()
        .max(
          500,
          "Les observations ne peuvent pas dépasser 500 caractères."
        )
        .optional()
        .or(
          z.literal("")
        ),
  });

export type CloseJournalCaisseDto =
  z.infer<
    typeof closeJournalCaisseSchema
  >;