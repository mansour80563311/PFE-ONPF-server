import { z } from "zod";

/*
 * Accepte un montant sous forme de nombre
 * ou de chaîne de caractères.
 *
 * Exemples acceptés :
 * - 100
 * - 100.5
 * - "100.000"
 * - "120,500"
 */
const montantSchema = z
  .union([
    z.string(),
    z.number(),
  ])
  .transform((value) =>
    String(value)
      .trim()
      .replace(",", ".")
  )
  .refine(
    (value) =>
      /^\d+(\.\d{1,3})?$/.test(
        value
      ),
    {
      message:
        "Le montant remis doit être un nombre positif avec au maximum trois décimales.",
    }
  )
  .refine(
    (value) =>
      Number(value) > 0,
    {
      message:
        "Le montant remis doit être supérieur à zéro.",
    }
  )
  .refine(
    (value) =>
      Number(value) <=
      1_000_000,
    {
      message:
        "Le montant remis est trop élevé.",
    }
  );

export const createPaiementSchema =
  z.object({
    montantRemis:
      montantSchema,

    observations: z
      .string()
      .trim()
      .max(
        500,
        "Les observations ne peuvent pas dépasser 500 caractères."
      )
      .optional(),
  });

export type CreatePaiementDto =
  z.infer<
    typeof createPaiementSchema
  >;
  