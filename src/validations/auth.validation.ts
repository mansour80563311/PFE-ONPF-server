import { z } from "zod";

export const loginSchema = z.object({
  login: z
    .string()
    .min(3, "Le login est obligatoire"),

  password: z
    .string()
    .min(4, "Le mot de passe est obligatoire"),
});