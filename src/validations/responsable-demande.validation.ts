import { z } from "zod";

/**
 * Correction métier autorisée au Responsable Guichet
 * après le paiement initial et la transmission du dossier.
 *
 * Pour cette première étape, on limite volontairement
 * les corrections aux informations déjà présentes dans
 * le modèle métier des inscriptions :
 *
 * - numéro du titre foncier ;
 * - gouvernorat ;
 * - opérations foncières.
 *
 * Les champs "date" et "numéro d'inscription" évoqués
 * par l'encadreur ne sont pas encore présents dans le
 * schéma Prisma actuel et ne sont donc pas inventés ici.
 */
export const corrigerDemandeResponsableSchema =
  z
    .object({
      numeroTitreFoncier: z
        .string()
        .trim()
        .min(
          1,
          "Le numéro du titre foncier ne peut pas être vide."
        )
        .max(
          50,
          "Le numéro du titre foncier est trop long."
        )
        .optional(),

      gouvernoratId: z
        .string()
        .uuid(
          "Identifiant du gouvernorat invalide."
        )
        .optional(),

      operationFonciereIds: z
        .array(
          z
            .string()
            .uuid(
              "Identifiant d'opération foncière invalide."
            )
        )
        .min(
          1,
          "Au moins une opération foncière est obligatoire."
        )
        .max(
          20,
          "Le nombre d'opérations foncières est trop élevé."
        )
        .refine(
          (ids) =>
            new Set(ids).size ===
            ids.length,
          {
            message:
              "Une même opération foncière ne peut pas être sélectionnée plusieurs fois.",
          }
        )
        .optional(),

      motif: z
        .string()
        .trim()
        .max(
          500,
          "Le motif de correction ne peut pas dépasser 500 caractères."
        )
        .optional(),
    })
    .refine(
      (data) =>
        data.numeroTitreFoncier !==
          undefined ||
        data.gouvernoratId !==
          undefined ||
        data.operationFonciereIds !==
          undefined,
      {
        message:
          "Au moins une information métier doit être corrigée.",
      }
    );

export type CorrigerDemandeResponsableDto =
  z.infer<
    typeof corrigerDemandeResponsableSchema
  >;