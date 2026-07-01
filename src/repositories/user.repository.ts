import prisma from "../config/prisma";

export class UserRepository {
  async findByLogin(login: string) {
    return prisma.utilisateur.findUnique({
      where: {
        login,
      },
      include: {
        role: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.utilisateur.findUnique({
      where: {
        id,
      },
      include: {
        role: true,
      },
    });
  }
}