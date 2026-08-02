-- CreateEnum
CREATE TYPE "LangueCertificat" AS ENUM ('FRANCAIS', 'ARABE', 'ANGLAIS');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('PAYE', 'REMBOURSE');

-- AlterTable
ALTER TABLE "Demande" ADD COLUMN     "langueCertificat" "LangueCertificat" NOT NULL DEFAULT 'FRANCAIS',
ADD COLUMN     "montantTotal" DECIMAL(10,3) NOT NULL DEFAULT 30.000,
ADD COLUMN     "nombreExemplaires" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "prixUnitaire" DECIMAL(10,3) NOT NULL DEFAULT 30.000,
ADD COLUMN     "supplementTraduction" DECIMAL(10,3) NOT NULL DEFAULT 0.000,
ADD COLUMN     "traductionDemandee" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "numeroRecu" TEXT NOT NULL,
    "montantExigible" DECIMAL(10,3) NOT NULL,
    "montantRemis" DECIMAL(10,3) NOT NULL,
    "monnaieRendue" DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    "montantEncaisse" DECIMAL(10,3) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "statut" "StatutPaiement" NOT NULL DEFAULT 'PAYE',
    "montantEnLettres" TEXT,
    "observations" TEXT,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demandeId" TEXT NOT NULL,
    "caissierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_numeroRecu_key" ON "Paiement"("numeroRecu");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_demandeId_key" ON "Paiement"("demandeId");

-- CreateIndex
CREATE INDEX "Paiement_caissierId_idx" ON "Paiement"("caissierId");

-- CreateIndex
CREATE INDEX "Paiement_datePaiement_idx" ON "Paiement"("datePaiement");

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_caissierId_fkey" FOREIGN KEY ("caissierId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
