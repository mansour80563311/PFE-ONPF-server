import { UserRepository } from "../repositories/user.repository";
import { comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";

export class AuthService {
  private userRepository = new UserRepository();

  async login(login: string, password: string) {
    const user = await this.userRepository.findByLogin(login);

    if (!user) {
      throw new Error("Login ou mot de passe incorrect.");
    }

    if (!user.statut) {
      throw new Error("Votre compte est désactivé.");
    }

    const isPasswordValid = await comparePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error("Login ou mot de passe incorrect.");
    }

    const token = generateToken({
      userId: user.id,
      role: user.role.nom,
    });

    return {
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        login: user.login,
        role: user.role.nom,
      },
    };
  }
}