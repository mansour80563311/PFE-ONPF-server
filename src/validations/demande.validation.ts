import {
  LangueCertificat,
  StatutDemande,
} from "@prisma/client";

import { z } from "zod";

/*
 * Champs communs à la création
 * et à la modification d’une demande.
 */
const demandeBaseSchema = z.object({
  nomDemandeur: z
    .string()
    .trim()
    .min(
      2,
      "Le nom est obligatoire."
    ),

  prenomDemandeur: z
    .string()
    .trim()
    .min(
      2,
      "Le prénom est obligatoire."
    ),

  cin: z
    .string()
    .trim()
    .regex(
      /^\d{8}$/,
      "Le CIN doit contenir exactement 8 chiffres."
    ),

  telephone: z
    .string()
    .trim()
    .regex(
      /^\d{8}$/,
      "Le téléphone est invalide."
    ),

  email: z
    .union([
      z.email(
        "Email invalide."
      ),
      z.literal(""),
    ])
    .optional(),

  referenceFonciere: z
    .string()
    .trim()
    .min(
      2,
      "La référence foncière est obligatoire."
    ),

  adresseBien: z
    .string()
    .trim()
    .min(
      5,
      "L'adresse du bien est obligatoire."
    ),

  observations: z
    .string()
    .trim()
    .max(
      500,
      "Les observations ne peuvent pas dépasser 500 caractères."
    )
    .optional(),
});

/*
 * Validation des informations tarifaires.
 */
const tarificationSchema = z.object({
  nombreExemplaires: z.coerce
    .number()
    .int(
      "Le nombre d’exemplaires doit être un nombre entier."
    )
    .min(
      1,
      "Le nombre d’exemplaires doit être supérieur ou égal à 1."
    )
    .max(
      20,
      "Le nombre d’exemplaires ne peut pas dépasser 20."
    ),

  langueCertificat:
    z.nativeEnum(
      LangueCertificat
    ),

  traductionDemandee:
    z.boolean(),
});

/*
 * À la création, les paramètres tarifaires
 * possèdent des valeurs par défaut.
 */
export const createDemandeSchema =
  demandeBaseSchema.extend({
    nombreExemplaires:
      tarificationSchema.shape
        .nombreExemplaires
        .default(1),

    langueCertificat:
      tarificationSchema.shape
        .langueCertificat
        .default(
          LangueCertificat.FRANCAIS
        ),

    traductionDemandee:
      tarificationSchema.shape
        .traductionDemandee
        .default(false),
  });

/*
 * Lors d’une modification, tous les champs
 * sont facultatifs.
 *
 * Aucun prix calculé n’est accepté depuis
 * le frontend.
 */
export const updateDemandeSchema =
  demandeBaseSchema
    .extend({
      nombreExemplaires:
        tarificationSchema.shape
          .nombreExemplaires,

      langueCertificat:
        tarificationSchema.shape
          .langueCertificat,

      traductionDemandee:
        tarificationSchema.shape
          .traductionDemandee,
    })
    .partial();

/*
 * Les informations retournées par le CNI
 * et les montants calculés ne sont jamais
 * acceptés depuis le frontend.
 *
 * Le backend calcule lui-même :
 * - le prix unitaire ;
 * - le supplément de traduction ;
 * - le montant total.
 */
export type CreateDemandeDto =
  z.infer<
    typeof createDemandeSchema
  >;

export type CreateDemandeServiceDto =
  CreateDemandeDto & {
    utilisateurId: string;
  };

export type UpdateDemandeDto =
  z.infer<
    typeof updateDemandeSchema
  >;

export const listDemandesSchema =
  z.object({
    page: z.coerce
      .number()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .min(1)
      .max(100)
      .default(10),

    search: z
      .string()
      .optional(),
  });

export type ListDemandesDto =
  z.infer<
    typeof listDemandesSchema
  >;

export const updateDemandeStatusSchema =
  z
    .object({
      statut:
        z.nativeEnum(
          StatutDemande
        ),

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
    .superRefine(
      (
        data,
        ctx
      ) => {
        if (
          data.statut ===
            StatutDemande.REJETEE &&
          !data.motifRejet
        ) {
          ctx.addIssue({
            code: "custom",
            path: [
              "motifRejet",
            ],
            message:
              "Le motif de rejet est obligatoire lorsqu’une demande est rejetée.",
          });
        }
      }
    );

export type UpdateDemandeStatusDto =
  z.infer<
    typeof updateDemandeStatusSchema
  >;