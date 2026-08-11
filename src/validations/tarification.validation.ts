import { z } from "zod";


const inscriptionTarificationSchema = z.object({
  nature: z.literal("INSCRIPTION"),

  operationFonciereIds: z
    .array(
      z.string().uuid(
        "Identifiant d'opération foncière invalide."
      )
    )
    .min(
      1,
      "Au moins une opération foncière est obligatoire."
    )
    .refine(
      (ids) => new Set(ids).size === ids.length,
      {
        message:
          "Une même opération foncière ne peut pas être sélectionnée plusieurs fois.",
      }
    ),
});


const prestationTarificationSchema = z.object({
  nature: z.literal("PRESTATION"),

  prestationId: z
    .string()
    .uuid(
      "Identifiant de prestation invalide."
    ),

  nombrePages: z
    .number()
    .int(
      "Le nombre de pages doit être un entier."
    )
    .positive(
      "Le nombre de pages doit être supérieur à zéro."
    )
    .optional(),

  langue: z.enum([
    "ARABE",
    "FRANCAIS",
  ]),
});


export const calculTarificationSchema =
  z.discriminatedUnion(
    "nature",
    [
      inscriptionTarificationSchema,
      prestationTarificationSchema,
    ]
  );


export type CalculTarificationInput =
  z.infer<typeof calculTarificationSchema>;