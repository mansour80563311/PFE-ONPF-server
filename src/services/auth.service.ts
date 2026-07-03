import { UserRepository } from "../repositories/user.repository";
import { comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { AppError } from "../errors/AppError";

export class AuthService {
  private userRepository = new UserRepository();

  async login(login: string, password: string) {
    const user = await this.userRepository.findByLogin(login);

    if (!user) {
      throw new AppError("Login ou mot de passe incorrect.", 401);
    }

    if (!user.statut) {
        throw new AppError("Utilisateur désactivé.", 403);
    }

    const isPasswordValid = await comparePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
        throw new AppError("Login ou mot de passe incorrect.", 401);
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
  async me(userId: string) {

    return this.userRepository.findById(userId);

    }
}