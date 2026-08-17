-- CreateEnum
CREATE TYPE "StatutRevisionDemande" AS ENUM ('SANS_COMPLEMENT', 'COMPLEMENT_A_PAYER', 'COMPLEMENT_PAYE');

-- CreateTable
CREATE TABLE "RevisionDemande" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "numeroRevision" INTEGER NOT NULL,
    "responsableId" TEXT NOT NULL,
    "donneesAvant" JSONB NOT NULL,
    "donneesApres" JSONB NOT NULL,
    "motif" TEXT,
    "montantAvant" DECIMAL(10,3) NOT NULL,
    "montantApres" DECIMAL(10,3) NOT NULL,
    "complementDu" DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    "referenceReglementaire" TEXT,
    "statut" "StatutRevisionDemande" NOT NULL DEFAULT 'SANS_COMPLEMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionDemande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneRevisionTarification" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "type" "TypeLigneTarification" NOT NULL,
    "code" TEXT,
    "libelle" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "montantUnitaire" DECIMAL(10,3) NOT NULL,
    "montant" DECIMAL(10,3) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneRevisionTarification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaiementComplementaire" (
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
    "revisionId" TEXT NOT NULL,
    "caissierId" TEXT NOT NULL,
    "journalCaisseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaiementComplementaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevisionDemande_demandeId_idx" ON "RevisionDemande"("demandeId");

-- CreateIndex
CREATE INDEX "RevisionDemande_responsableId_idx" ON "RevisionDemande"("responsableId");

-- CreateIndex
CREATE INDEX "RevisionDemande_statut_idx" ON "RevisionDemande"("statut");

-- CreateIndex
CREATE INDEX "RevisionDemande_createdAt_idx" ON "RevisionDemande"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionDemande_demandeId_numeroRevision_key" ON "RevisionDemande"("demandeId", "numeroRevision");

-- CreateIndex
CREATE INDEX "LigneRevisionTarification_revisionId_idx" ON "LigneRevisionTarification"("revisionId");

-- CreateIndex
CREATE INDEX "LigneRevisionTarification_type_idx" ON "LigneRevisionTarification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PaiementComplementaire_numeroRecu_key" ON "PaiementComplementaire"("numeroRecu");

-- CreateIndex
CREATE UNIQUE INDEX "PaiementComplementaire_revisionId_key" ON "PaiementComplementaire"("revisionId");

-- CreateIndex
CREATE INDEX "PaiementComplementaire_demandeId_idx" ON "PaiementComplementaire"("demandeId");

-- CreateIndex
CREATE INDEX "PaiementComplementaire_caissierId_idx" ON "PaiementComplementaire"("caissierId");

-- CreateIndex
CREATE INDEX "PaiementComplementaire_journalCaisseId_idx" ON "PaiementComplementaire"("journalCaisseId");

-- CreateIndex
CREATE INDEX "PaiementComplementaire_datePaiement_idx" ON "PaiementComplementaire"("datePaiement");

-- AddForeignKey
ALTER TABLE "RevisionDemande" ADD CONSTRAINT "RevisionDemande_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionDemande" ADD CONSTRAINT "RevisionDemande_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneRevisionTarification" ADD CONSTRAINT "LigneRevisionTarification_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "RevisionDemande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementComplementaire" ADD CONSTRAINT "PaiementComplementaire_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementComplementaire" ADD CONSTRAINT "PaiementComplementaire_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "RevisionDemande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementComplementaire" ADD CONSTRAINT "PaiementComplementaire_caissierId_fkey" FOREIGN KEY ("caissierId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementComplementaire" ADD CONSTRAINT "PaiementComplementaire_journalCaisseId_fkey" FOREIGN KEY ("journalCaisseId") REFERENCES "JournalCaisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
