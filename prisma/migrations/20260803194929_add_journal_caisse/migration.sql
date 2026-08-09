-- CreateEnum
CREATE TYPE "StatutJournalCaisse" AS ENUM ('OUVERT', 'CLOTURE');

-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN     "journalCaisseId" TEXT;

-- CreateTable
CREATE TABLE "JournalCaisse" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dateJour" DATE NOT NULL,
    "statut" "StatutJournalCaisse" NOT NULL DEFAULT 'OUVERT',
    "dateCloture" TIMESTAMP(3),
    "observations" TEXT,
    "caissierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalCaisse_numero_key" ON "JournalCaisse"("numero");

-- CreateIndex
CREATE INDEX "JournalCaisse_caissierId_idx" ON "JournalCaisse"("caissierId");

-- CreateIndex
CREATE INDEX "JournalCaisse_dateJour_idx" ON "JournalCaisse"("dateJour");

-- CreateIndex
CREATE INDEX "JournalCaisse_statut_idx" ON "JournalCaisse"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "JournalCaisse_caissierId_dateJour_key" ON "JournalCaisse"("caissierId", "dateJour");

-- CreateIndex
CREATE INDEX "Paiement_journalCaisseId_idx" ON "Paiement"("journalCaisseId");

-- AddForeignKey
ALTER TABLE "JournalCaisse" ADD CONSTRAINT "JournalCaisse_caissierId_fkey" FOREIGN KEY ("caissierId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_journalCaisseId_fkey" FOREIGN KEY ("journalCaisseId") REFERENCES "JournalCaisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
