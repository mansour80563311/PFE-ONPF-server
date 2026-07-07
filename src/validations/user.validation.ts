import { z } from "zod";

export const createUserSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères."),

  prenom: z
    .string()
    .trim()
    .min(2, "Le prénom doit contenir au moins 2 caractères."),

  email: z
    .email("Adresse email invalide."),

  telephone: z
    .string()
    .trim()
    .optional(),

  login: z
    .string()
    .trim()
    .min(3, "Le login doit contenir au moins 3 caractères."),

  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),

  roleId: z.uuid("Identifiant du rôle invalide."),

  statut: z.boolean().optional()
});

// Schéma de validation pour la mise à jour d'un utilisateur
export const updateUserSchema = createUserSchema.partial();

// Schéma de validation pour la récupération d'utilisateurs avec pagination et recherche
export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),

  limit: z.coerce.number().int().positive().max(100).default(10),

  search: z.string().optional()
});

// Types pour les DTOs (evite d'ecrire deux fois les mêmes types)
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ListUsersDto = z.infer<typeof listUsersSchema>;