import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Création des rôles
  const adminRole = await prisma.role.upsert({
    where: { nom: "ADMIN" },
    update: {},
    create: {
      nom: "ADMIN",
      description: "Administrateur du système",
    },
  });

  await prisma.role.upsert({
    where: { nom: "AGENT" },
    update: {},
    create: {
      nom: "AGENT",
      description: "Agent",
    },
  });

  await prisma.role.upsert({
    where: { nom: "RESPONSABLE" },
    update: {},
    create: {
      nom: "RESPONSABLE",
      description: "Responsable",
    },
  });

  // Vérifier si l'admin existe déjà
  const existingAdmin = await prisma.utilisateur.findUnique({
    where: {
      login: "admin",
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await prisma.utilisateur.create({
      data: {
        nom: "Administrateur",
        prenom: "Système",
        email: "admin@onpf.local",
        telephone: "00000000",
        login: "admin",
        password: hashedPassword,
        statut: true,
        roleId: adminRole.id,
      },
    });

    console.log("✅ Administrateur créé.");
  } else {
    console.log("ℹ️ L'administrateur existe déjà.");
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });