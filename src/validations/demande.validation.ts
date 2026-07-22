import { StatutDemande } from "@prisma/client";
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

  
});

export const updateDemandeSchema =
  createDemandeSchema.partial();

export type CreateDemandeDto =
  z.infer<typeof createDemandeSchema>;

export type CreateDemandeServiceDto =
  CreateDemandeDto & {
    utilisateurId: string;
  };

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

export const updateDemandeStatusSchema = z
  .object({
    statut: z.nativeEnum(StatutDemande),

    motifRejet: z
      .string()
      .trim()
      .min(
        5,
        "Le motif de rejet doit contenir au moins 5 caractères."
      )
      .max(
        500,
        "Le motif de rejet ne peut pas dépasser 500 caractères."
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.statut === StatutDemande.REJETEE &&
      !data.motifRejet
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["motifRejet"],
        message:
          "Le motif de rejet est obligatoire lorsqu’une demande est rejetée.",
      });
    }
  });

export type UpdateDemandeStatusDto = z.infer<
  typeof updateDemandeStatusSchema
>;