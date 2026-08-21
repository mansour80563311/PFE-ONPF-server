-- CreateEnum
CREATE TYPE "StatutJournalCloture" AS ENUM ('CLOTURE', 'DECLOTUREE');

-- CreateEnum
CREATE TYPE "TypeEvenementJournalCloture" AS ENUM ('CLOTURE', 'DECLOTURE');

-- AlterTable
ALTER TABLE "JournalCloture" ADD COLUMN     "statut" "StatutJournalCloture" NOT NULL DEFAULT 'CLOTURE';

-- CreateTable
CREATE TABLE "JournalClotureEvenement" (
    "id" TEXT NOT NULL,
    "journalClotureId" TEXT NOT NULL,
    "type" "TypeEvenementJournalCloture" NOT NULL,
    "auteurId" TEXT NOT NULL,
    "motif" TEXT,
    "dateEvenement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalClotureEvenement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalClotureEvenement_journalClotureId_idx" ON "JournalClotureEvenement"("journalClotureId");

-- CreateIndex
CREATE INDEX "JournalClotureEvenement_auteurId_idx" ON "JournalClotureEvenement"("auteurId");

-- CreateIndex
CREATE INDEX "JournalClotureEvenement_type_idx" ON "JournalClotureEvenement"("type");

-- CreateIndex
CREATE INDEX "JournalClotureEvenement_dateEvenement_idx" ON "JournalClotureEvenement"("dateEvenement");

-- CreateIndex
CREATE INDEX "JournalCloture_statut_idx" ON "JournalCloture"("statut");

-- AddForeignKey
ALTER TABLE "JournalClotureEvenement" ADD CONSTRAINT "JournalClotureEvenement_journalClotureId_fkey" FOREIGN KEY ("journalClotureId") REFERENCES "JournalCloture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalClotureEvenement" ADD CONSTRAINT "JournalClotureEvenement_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
