-- AlterTable
ALTER TABLE "Demande" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Utilisateur" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "HistoriqueStatutDemande" (
    "id" TEXT NOT NULL,
    "ancienStatut" "StatutDemande" NOT NULL,
    "nouveauStatut" "StatutDemande" NOT NULL,
    "motif" TEXT,
    "demandeId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueStatutDemande_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoriqueStatutDemande_demandeId_idx" ON "HistoriqueStatutDemande"("demandeId");

-- CreateIndex
CREATE INDEX "HistoriqueStatutDemande_utilisateurId_idx" ON "HistoriqueStatutDemande"("utilisateurId");

-- AddForeignKey
ALTER TABLE "HistoriqueStatutDemande" ADD CONSTRAINT "HistoriqueStatutDemande_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStatutDemande" ADD CONSTRAINT "HistoriqueStatutDemande_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
