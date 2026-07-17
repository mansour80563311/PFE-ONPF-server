-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'VALIDEE', 'REJETEE');

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Demande" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nomDemandeur" TEXT NOT NULL,
    "prenomDemandeur" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "referenceFonciere" TEXT NOT NULL,
    "adresseBien" TEXT NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'EN_ATTENTE',
    "observations" TEXT,
    "utilisateurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demande_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Demande_numero_key" ON "Demande"("numero");

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
