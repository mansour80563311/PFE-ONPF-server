import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class RoleRepository {

  async findAll() {

    return prisma.role.findMany({
      orderBy: {
        nom: "asc",
      },
    });

  }

}