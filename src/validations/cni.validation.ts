import { z } from "zod";

export const verifierCniSchema = z.object({
  cin: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) {
          return "Le numéro CIN est obligatoire.";
        }

        return "Le numéro CIN doit être une chaîne de caractères.";
      },
    })
    .trim()
    .min(1, {
      error: "Le numéro CIN est obligatoire.",
    })
    .regex(/^\d{8}$/, {
      error:
        "Le numéro CIN doit contenir exactement 8 chiffres.",
    }),
});

export type VerifierCniInput =
  z.infer<typeof verifierCniSchema>;