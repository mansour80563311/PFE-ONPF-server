-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('CIN', 'PASSEPORT', 'CONTRAT', 'PROCURATION');

-- CreateEnum
CREATE TYPE "StatutDocument" AS ENUM ('DEPOSE', 'CONFORME', 'NON_CONFORME');

-- CreateTable
CREATE TABLE "DemandeDocument" (
    "id" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "nomOriginal" TEXT NOT NULL,
    "nomStockage" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "statut" "StatutDocument" NOT NULL DEFAULT 'DEPOSE',
    "motifNonConformite" TEXT,
    "demandeId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeDocument_nomStockage_key" ON "DemandeDocument"("nomStockage");

-- CreateIndex
CREATE INDEX "DemandeDocument_demandeId_idx" ON "DemandeDocument"("demandeId");

-- CreateIndex
CREATE INDEX "DemandeDocument_utilisateurId_idx" ON "DemandeDocument"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeDocument_demandeId_type_key" ON "DemandeDocument"("demandeId", "type");

-- AddForeignKey
ALTER TABLE "DemandeDocument" ADD CONSTRAINT "DemandeDocument_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeDocument" ADD CONSTRAINT "DemandeDocument_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
