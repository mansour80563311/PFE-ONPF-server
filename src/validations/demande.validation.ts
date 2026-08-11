import {
  LangueCertificat,
  StatutDemande,
} from "@prisma/client";

import { z } from "zod";

/**
 * ============================================================
 * CHAMPS COMMUNS A UNE NOUVELLE DEMANDE
 * ============================================================
 *
 * Les informations d'identité sont encore reçues depuis
 * le formulaire, mais le backend continuera à utiliser
 * les informations retournées par le service CNI comme
 * source de vérité.
 */
const nouvelleDemandeBaseSchema = z.object({
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

  /**
   * Conservé pour le moment car le champ
   * existe toujours dans la base.
   */
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


/**
 * ============================================================
 * CREATION D'UNE DEMANDE D'INSCRIPTION
 * ============================================================
 */
const createInscriptionSchema =
  nouvelleDemandeBaseSchema.extend({
    nature: z.literal(
      "INSCRIPTION"
    ),

    gouvernoratId: z
      .string()
      .uuid(
        "Identifiant du gouvernorat invalide."
      ),

    numeroTitreFoncier: z
      .string()
      .trim()
      .min(
        1,
        "Le numéro du titre foncier est obligatoire."
      )
      .max(
        50,
        "Le numéro du titre foncier est trop long."
      ),

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
      ),
  });


/**
 * ============================================================
 * CREATION D'UNE DEMANDE DE PRESTATION
 * ============================================================
 */
const createPrestationSchema =
  nouvelleDemandeBaseSchema.extend({
    nature: z.literal(
      "PRESTATION"
    ),

    prestationId: z
      .string()
      .uuid(
        "Identifiant de prestation invalide."
      ),

    /**
     * Ces champs sont facultatifs au niveau
     * du DTO car certaines prestations ne
     * nécessitent pas de titre foncier.
     *
     * Le Service vérifiera ensuite la règle
     * selon la prestation sélectionnée.
     */
    gouvernoratId: z
      .string()
      .uuid(
        "Identifiant du gouvernorat invalide."
      )
      .optional(),

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

    /**
     * Obligatoire uniquement lorsque
     * la prestation est tarifée par page.
     *
     * La vérification exacte est réalisée
     * par TarificationService.
     */
    nombrePages: z.coerce
      .number()
      .int(
        "Le nombre de pages doit être un entier."
      )
      .min(
        1,
        "Le nombre de pages doit être supérieur ou égal à 1."
      )
      .max(
        10000,
        "Le nombre de pages est trop élevé."
      )
      .optional(),

    /**
     * L'anglais n'est plus proposé dans
     * le nouveau moteur réglementaire.
     */
    langue: z.enum([
      "ARABE",
      "FRANCAIS",
    ]),
  });


/**
 * ============================================================
 * SCHEMA DE CREATION
 * ============================================================
 */
export const createDemandeSchema =
  z
    .discriminatedUnion(
      "nature",
      [
        createInscriptionSchema,
        createPrestationSchema,
      ]
    )
    .superRefine(
      (
        data,
        ctx
      ) => {
        if (
          data.nature !==
          "PRESTATION"
        ) {
          return;
        }

        /**
         * Si l'un des deux champs du titre
         * est fourni, l'autre doit également
         * être présent.
         */
        const hasGouvernorat =
          data.gouvernoratId !==
          undefined;

        const hasNumeroTitre =
          data.numeroTitreFoncier !==
          undefined;

        if (
          hasGouvernorat !==
          hasNumeroTitre
        ) {
          ctx.addIssue({
            code: "custom",
            path: [
              "numeroTitreFoncier",
            ],
            message:
              "Le gouvernorat et le numéro du titre foncier doivent être renseignés ensemble.",
          });
        }
      }
    );


/**
 * ============================================================
 * MODIFICATION D'UNE DEMANDE
 * ============================================================
 *
 * Pendant la phase de migration, ce schéma accepte :
 *
 * - les nouveaux champs métier ;
 * - les anciens paramètres tarifaires.
 *
 * DemandeService décidera ensuite lesquels sont autorisés
 * selon qu'il s'agit d'une ancienne ou d'une nouvelle demande.
 *
 * La nature de la demande n'est volontairement
 * pas modifiable.
 */
export const updateDemandeSchema =
  z.object({
    /**
     * --------------------------------------------------------
     * IDENTITE ET CONTACT
     * --------------------------------------------------------
     */

    nomDemandeur: z
      .string()
      .trim()
      .min(
        2,
        "Le nom est obligatoire."
      )
      .optional(),

    prenomDemandeur: z
      .string()
      .trim()
      .min(
        2,
        "Le prénom est obligatoire."
      )
      .optional(),

    cin: z
      .string()
      .trim()
      .regex(
        /^\d{8}$/,
        "Le CIN doit contenir exactement 8 chiffres."
      )
      .optional(),

    telephone: z
      .string()
      .trim()
      .regex(
        /^\d{8}$/,
        "Le téléphone est invalide."
      )
      .optional(),

    email: z
      .union([
        z.email(
          "Email invalide."
        ),
        z.literal(""),
      ])
      .optional(),

    adresseBien: z
      .string()
      .trim()
      .min(
        5,
        "L'adresse du bien est obligatoire."
      )
      .optional(),

    observations: z
      .string()
      .trim()
      .max(
        500,
        "Les observations ne peuvent pas dépasser 500 caractères."
      )
      .optional(),


    /**
     * --------------------------------------------------------
     * NOUVEAU TITRE FONCIER
     * --------------------------------------------------------
     *
     * Ces deux champs permettront ensuite
     * de modifier le couple :
     *
     * numéro du titre + gouvernorat.
     */

    gouvernoratId: z
      .string()
      .uuid(
        "Identifiant du gouvernorat invalide."
      )
      .optional(),

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


    /**
     * --------------------------------------------------------
     * INSCRIPTION
     * --------------------------------------------------------
     *
     * Une demande d'inscription peut contenir
     * une ou plusieurs opérations foncières.
     */

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


    /**
     * --------------------------------------------------------
     * PRESTATION
     * --------------------------------------------------------
     */

    prestationId: z
      .string()
      .uuid(
        "Identifiant de prestation invalide."
      )
      .optional(),

    nombrePages: z.coerce
      .number()
      .int(
        "Le nombre de pages doit être un entier."
      )
      .min(
        1,
        "Le nombre de pages doit être supérieur ou égal à 1."
      )
      .max(
        10000,
        "Le nombre de pages est trop élevé."
      )
      .optional(),

    langue: z
      .enum([
        "ARABE",
        "FRANCAIS",
      ])
      .optional(),


    /**
     * --------------------------------------------------------
     * ANCIENS CHAMPS
     * --------------------------------------------------------
     *
     * Ils sont conservés temporairement pour
     * assurer la compatibilité avec les demandes
     * créées avant la migration du nouveau
     * système tarifaire.
     */

    referenceFonciere: z
      .string()
      .trim()
      .min(
        2,
        "La référence foncière est obligatoire."
      )
      .optional(),

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
      )
      .optional(),

    langueCertificat:
      z.nativeEnum(
        LangueCertificat
      )
      .optional(),

    traductionDemandee:
      z.boolean()
        .optional(),
  });


/**
 * ============================================================
 * TYPES
 * ============================================================
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


/**
 * ============================================================
 * LISTE DES DEMANDES
 * ============================================================
 */
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


/**
 * ============================================================
 * CHANGEMENT DE STATUT
 * ============================================================
 */
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