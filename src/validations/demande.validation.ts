import { z } from "zod";

export const createDemandeSchema = z.object({
  nomDemandeur: z
    .string()
    .min(2, "Le nom est obligatoire."),

  prenomDemandeur: z
    .string()
    .min(2, "Le prénom est obligatoire."),

  cin: z
    .string()
    .regex(/^\d{8}$/,"Le CIN doit contenir exactement 8 chiffres."),

  telephone: z
    .string()
    .regex(/^\d{8}$/, "Le téléphone est invalide."),

  email: z
    .email("Email invalide.")
    .optional()
    .or(z.literal("")),

  referenceFonciere: z
    .string()
    .min(2, "La référence foncière est obligatoire."),

  adresseBien: z
    .string()
    .min(5, "L'adresse est obligatoire."),

  observations: z
    .string()
    .optional(),

  utilisateurId: z.uuid("Utilisateur invalide."),
});

export const updateDemandeSchema =
  createDemandeSchema.partial();

export type CreateDemandeDto =
  z.infer<typeof createDemandeSchema>;

export type UpdateDemandeDto =
  z.infer<typeof updateDemandeSchema>;

export const listDemandesSchema = z.object({
  page: z.coerce.number().min(1).default(1),

  limit: z.coerce.number().min(1).max(100).default(10),

  search: z.string().optional(),
});

export type ListDemandesDto = z.infer<
  typeof listDemandesSchema
>;