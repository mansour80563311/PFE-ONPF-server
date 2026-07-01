import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Chiffre un mot de passe.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare un mot de passe en clair avec son hash.
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};