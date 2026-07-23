import {
  Prisma,
  TypeDocument,
} from "@prisma/client";

import prisma from "../config/prisma";

export class DemandeDocumentRepository {
  async findByDemandeAndType(
    demandeId: string,
    type: TypeDocument
  ) {
    return prisma.demandeDocument.findUnique({
      where: {
        demandeId_type: {
          demandeId,
          type,
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.demandeDocument.findUnique({
        where: {
        id,
        },
    });
    }

  async findIdentityDocument(
    demandeId: string
  ) {
    return prisma.demandeDocument.findFirst({
      where: {
        demandeId,
        type: {
          in: [
            TypeDocument.CIN,
            TypeDocument.PASSEPORT,
          ],
        },
      },
    });
  }

  async create(
    data: Prisma.DemandeDocumentCreateInput
  ) {
    return prisma.demandeDocument.create({
      data,
      include: {
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            login: true,
          },
        },
      },
    });
  }

  async findAllByDemandeId(
    demandeId: string
  ) {
    return prisma.demandeDocument.findMany({
      where: {
        demandeId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            login: true,
          },
        },
      },
    });
  }
  async delete(id: string) {
  return prisma.demandeDocument.delete({
    where: {
      id,
    },
  });
}
}

