-- AlterTable
ALTER TABLE "Demande" ADD COLUMN     "journalClotureId" TEXT;

-- CreateTable
CREATE TABLE "JournalCloture" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dateJour" DATE NOT NULL,
    "dateCloture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observations" TEXT,
    "responsableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalCloture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalCloture_numero_key" ON "JournalCloture"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "JournalCloture_dateJour_key" ON "JournalCloture"("dateJour");

-- CreateIndex
CREATE INDEX "JournalCloture_responsableId_idx" ON "JournalCloture"("responsableId");

-- CreateIndex
CREATE INDEX "Demande_journalClotureId_idx" ON "Demande"("journalClotureId");

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_journalClotureId_fkey" FOREIGN KEY ("journalClotureId") REFERENCES "JournalCloture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalCloture" ADD CONSTRAINT "JournalCloture_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
