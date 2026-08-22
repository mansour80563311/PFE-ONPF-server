import { z } from "zod";

const dateClotureSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "La date doit respecter le format AAAA-MM-JJ."
  )
  .refine((value) => {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        value
      );

    if (!match) {
      return false;
    }

    const year =
      Number(match[1]);

    const month =
      Number(match[2]);

    const day =
      Number(match[3]);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() ===
        month - 1 &&
      date.getUTCDate() === day
    );
  }, "La date renseignée est invalide.");

export const listDemandesADistribuerSchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),

    search: z
      .string()
      .trim()
      .optional(),

    /*
     * Filtre facultatif sur la journée de clôture
     * du guichet.
     */
    dateCloture:
      dateClotureSchema.optional(),
  });

export const listAgentsAffectablesSchema =
  z.object({
    role: z.enum([
      "REDACTEUR",
      "VERIFICATEUR",
      "SUPER_VERIFICATEUR",
    ]),
  });

export const etudeOperationIdParamSchema =
  z.object({
    etudeOperationId: z
      .string()
      .uuid(
        "L’identifiant de l’opération d’étude est invalide."
      ),
  });

export const dossierEtudeIdParamSchema =
  z.object({
    dossierId: z
      .string()
      .uuid(
        "L’identifiant du dossier d’étude est invalide."
      ),
  });

export const listDossiersRedacteurSchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),

    search: z
      .string()
      .trim()
      .optional(),
  });

export const listDossiersVerificateurSchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),

    search: z
      .string()
      .trim()
      .optional(),
  });

export const listDossiersSuperVerificateurSchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),

    search: z
      .string()
      .trim()
      .optional(),
  });

const observationsAvisSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Les observations ne peuvent pas être vides."
    )
    .optional();

const minuteInscriptionSchema =
  z
    .object({
      modePreparation:
        z.enum([
          "MODELE",
          "MANUEL",
        ]),

      referenceModele: z
        .string()
        .trim()
        .min(
          1,
          "La référence du modèle ne peut pas être vide."
        )
        .optional(),

      contenu: z
        .string()
        .trim()
        .min(
          1,
          "Le contenu de la minute est obligatoire."
        ),
    })
    .superRefine(
      (
        minute,
        ctx
      ) => {
        if (
          minute.modePreparation ===
            "MODELE" &&
          !minute.referenceModele
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,
            message:
              "La référence du modèle est obligatoire pour une minute préparée à partir d’un modèle.",
            path: [
              "referenceModele",
            ],
          });
        }

        if (
          minute.modePreparation ===
            "MANUEL" &&
          minute.referenceModele
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,
            message:
              "Une minute rédigée manuellement ne doit pas contenir de référence de modèle.",
            path: [
              "referenceModele",
            ],
          });
        }
      }
    );

export const enregistrerAvisRedacteurSchema =
  z.discriminatedUnion(
    "decision",
    [
      z.object({
        decision:
          z.literal(
            "INSCRIPTION"
          ),

        observations:
          observationsAvisSchema,

        minute:
          minuteInscriptionSchema,
      }),

      z.object({
        decision:
          z.literal(
            "REFUS"
          ),

        observations:
          observationsAvisSchema,

        motifsRefus: z
          .array(
            z
              .string()
              .trim()
              .min(
                1,
                "Un motif de refus ne peut pas être vide."
              )
          )
          .min(
            1,
            "Au moins un motif de refus est obligatoire."
          ),
      }),
    ]
  );

export const enregistrerAvisVerificateurSchema =
  z.discriminatedUnion(
    "decision",
    [
      z.object({
        decision:
          z.literal(
            "INSCRIPTION"
          ),

        observations:
          z
            .string()
            .trim()
            .min(
              1,
              "Les observations ne peuvent pas être vides."
            )
            .optional(),
      }),

      z.object({
        decision:
          z.literal(
            "REFUS"
          ),

        observations:
          z
            .string()
            .trim()
            .min(
              1,
              "Les observations ne peuvent pas être vides."
            )
            .optional(),

        motifsRefus: z
          .array(
            z
              .string()
              .trim()
              .min(
                1,
                "Un motif de refus ne peut pas être vide."
              )
          )
          .min(
            1,
            "Au moins un motif de refus est obligatoire."
          ),
      }),
    ]
  );

export const enregistrerAvisSuperVerificateurSchema =
  z.discriminatedUnion(
    "decision",
    [
      z.object({
        decision:
          z.literal(
            "INSCRIPTION"
          ),

        observations:
          z
            .string()
            .trim()
            .min(
              1,
              "Les observations ne peuvent pas être vides."
            )
            .optional(),
      }),

      z.object({
        decision:
          z.literal(
            "REFUS"
          ),

        observations:
          z
            .string()
            .trim()
            .min(
              1,
              "Les observations ne peuvent pas être vides."
            )
            .optional(),

        motifsRefus: z
          .array(
            z
              .string()
              .trim()
              .min(
                1,
                "Un motif de refus ne peut pas être vide."
              )
          )
          .min(
            1,
            "Au moins un motif de refus est obligatoire."
          ),
      }),
    ]
  );

export const modifierMinuteSuperVerificateurSchema =
  z.object({
    contenu: z
      .string()
      .trim()
      .min(
        1,
        "Le contenu de la minute est obligatoire."
      ),
  });

export const distribuerDossierEtudeSchema =
  z
    .object({
      demandeId: z
        .string()
        .uuid(
          "L’identifiant de la demande est invalide."
        ),

      redacteurId: z
        .string()
        .uuid(
          "L’identifiant du Rédacteur est invalide."
        ),

      verificateurId: z
        .string()
        .uuid(
          "L’identifiant du Vérificateur est invalide."
        ),

      superVerificateurId: z
        .string()
        .uuid(
          "L’identifiant du Super-vérificateur est invalide."
        ),
    })
    .superRefine(
      (
        data,
        ctx
      ) => {
        const ids = new Set([
          data.redacteurId,
          data.verificateurId,
          data.superVerificateurId,
        ]);

        if (ids.size !== 3) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,
            message:
              "Le Rédacteur, le Vérificateur et le Super-vérificateur doivent être trois utilisateurs distincts.",
            path: [
              "redacteurId",
            ],
          });
        }
      }
    );

export type ListDemandesADistribuerDto =
  z.infer<
    typeof listDemandesADistribuerSchema
  >;

export type ListAgentsAffectablesDto =
  z.infer<
    typeof listAgentsAffectablesSchema
  >;

export type DistribuerDossierEtudeDto =
  z.infer<
    typeof distribuerDossierEtudeSchema
  >;

export type ListDossiersRedacteurDto =
  z.infer<
    typeof listDossiersRedacteurSchema
  >;

export type DossierEtudeIdParamDto =
  z.infer<
    typeof dossierEtudeIdParamSchema
  >;

export type EtudeOperationIdParamDto =
  z.infer<
    typeof etudeOperationIdParamSchema
  >;

export type EnregistrerAvisRedacteurDto =
  z.infer<
    typeof enregistrerAvisRedacteurSchema
  >;

export type ListDossiersVerificateurDto =
  z.infer<
    typeof listDossiersVerificateurSchema
  >;

export type EnregistrerAvisVerificateurDto =
  z.infer<
    typeof enregistrerAvisVerificateurSchema
  >;

export type ListDossiersSuperVerificateurDto =
  z.infer<
    typeof listDossiersSuperVerificateurSchema
  >;

export type EnregistrerAvisSuperVerificateurDto =
  z.infer<
    typeof enregistrerAvisSuperVerificateurSchema
  >;

export type ModifierMinuteSuperVerificateurDto =
  z.infer<
    typeof modifierMinuteSuperVerificateurSchema
  >;
