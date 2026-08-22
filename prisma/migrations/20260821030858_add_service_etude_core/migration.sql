-- CreateEnum
CREATE TYPE "StatutDossierEtude" AS ENUM ('EN_ETUDE', 'TERMINE');

-- CreateEnum
CREATE TYPE "TypeAffectationEtude" AS ENUM ('REDACTEUR', 'VERIFICATEUR', 'SUPER_VERIFICATEUR');

-- CreateEnum
CREATE TYPE "StatutEtudeOperation" AS ENUM ('EN_REDACTION', 'EN_VERIFICATION', 'A_CORRIGER_REDACTEUR', 'EN_SUPER_VERIFICATION', 'A_CORRIGER_VERIFICATEUR', 'FINALISEE', 'CLOTUREE');

-- CreateTable
CREATE TABLE "DossierEtude" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "statut" "StatutDossierEtude" NOT NULL DEFAULT 'EN_ETUDE',
    "distribueParId" TEXT NOT NULL,
    "dateDistribution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DossierEtude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectationEtude" (
    "id" TEXT NOT NULL,
    "dossierEtudeId" TEXT NOT NULL,
    "type" "TypeAffectationEtude" NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "attribueParId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "motifReaffectation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffectationEtude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtudeOperation" (
    "id" TEXT NOT NULL,
    "dossierEtudeId" TEXT NOT NULL,
    "demandeOperationFonciereId" TEXT NOT NULL,
    "statut" "StatutEtudeOperation" NOT NULL DEFAULT 'EN_REDACTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtudeOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DossierEtude_demandeId_key" ON "DossierEtude"("demandeId");

-- CreateIndex
CREATE INDEX "DossierEtude_statut_idx" ON "DossierEtude"("statut");

-- CreateIndex
CREATE INDEX "DossierEtude_distribueParId_idx" ON "DossierEtude"("distribueParId");

-- CreateIndex
CREATE INDEX "DossierEtude_dateDistribution_idx" ON "DossierEtude"("dateDistribution");

-- CreateIndex
CREATE INDEX "AffectationEtude_dossierEtudeId_idx" ON "AffectationEtude"("dossierEtudeId");

-- CreateIndex
CREATE INDEX "AffectationEtude_dossierEtudeId_type_idx" ON "AffectationEtude"("dossierEtudeId", "type");

-- CreateIndex
CREATE INDEX "AffectationEtude_utilisateurId_idx" ON "AffectationEtude"("utilisateurId");

-- CreateIndex
CREATE INDEX "AffectationEtude_utilisateurId_dateFin_idx" ON "AffectationEtude"("utilisateurId", "dateFin");

-- CreateIndex
CREATE INDEX "AffectationEtude_attribueParId_idx" ON "AffectationEtude"("attribueParId");

-- CreateIndex
CREATE INDEX "AffectationEtude_dateDebut_idx" ON "AffectationEtude"("dateDebut");

-- CreateIndex
CREATE UNIQUE INDEX "EtudeOperation_demandeOperationFonciereId_key" ON "EtudeOperation"("demandeOperationFonciereId");

-- CreateIndex
CREATE INDEX "EtudeOperation_dossierEtudeId_idx" ON "EtudeOperation"("dossierEtudeId");

-- CreateIndex
CREATE INDEX "EtudeOperation_dossierEtudeId_statut_idx" ON "EtudeOperation"("dossierEtudeId", "statut");

-- CreateIndex
CREATE INDEX "EtudeOperation_statut_idx" ON "EtudeOperation"("statut");

-- AddForeignKey
ALTER TABLE "DossierEtude" ADD CONSTRAINT "DossierEtude_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierEtude" ADD CONSTRAINT "DossierEtude_distribueParId_fkey" FOREIGN KEY ("distribueParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationEtude" ADD CONSTRAINT "AffectationEtude_dossierEtudeId_fkey" FOREIGN KEY ("dossierEtudeId") REFERENCES "DossierEtude"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationEtude" ADD CONSTRAINT "AffectationEtude_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationEtude" ADD CONSTRAINT "AffectationEtude_attribueParId_fkey" FOREIGN KEY ("attribueParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtudeOperation" ADD CONSTRAINT "EtudeOperation_dossierEtudeId_fkey" FOREIGN KEY ("dossierEtudeId") REFERENCES "DossierEtude"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtudeOperation" ADD CONSTRAINT "EtudeOperation_demandeOperationFonciereId_fkey" FOREIGN KEY ("demandeOperationFonciereId") REFERENCES "DemandeOperationFonciere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
