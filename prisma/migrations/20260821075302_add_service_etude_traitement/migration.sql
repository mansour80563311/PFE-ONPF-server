/*
  Warnings:

  - A unique constraint covering the columns `[avisFinalId]` on the table `EtudeOperation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "NiveauAvisEtude" AS ENUM ('REDACTEUR', 'VERIFICATEUR', 'SUPER_VERIFICATEUR');

-- CreateEnum
CREATE TYPE "DecisionAvisEtude" AS ENUM ('INSCRIPTION', 'REFUS');

-- CreateEnum
CREATE TYPE "ModePreparationMinute" AS ENUM ('MODELE', 'MANUEL');

-- AlterTable
ALTER TABLE "EtudeOperation" ADD COLUMN     "avisFinalId" TEXT;

-- CreateTable
CREATE TABLE "AvisEtude" (
    "id" TEXT NOT NULL,
    "etudeOperationId" TEXT NOT NULL,
    "niveau" "NiveauAvisEtude" NOT NULL,
    "decision" "DecisionAvisEtude" NOT NULL,
    "numeroAvis" INTEGER NOT NULL,
    "auteurId" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvisEtude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotifRefus" (
    "id" TEXT NOT NULL,
    "avisEtudeId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotifRefus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinuteInscription" (
    "id" TEXT NOT NULL,
    "etudeOperationId" TEXT NOT NULL,
    "modePreparation" "ModePreparationMinute" NOT NULL,
    "referenceModele" TEXT,
    "versionFinaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinuteInscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionMinute" (
    "id" TEXT NOT NULL,
    "minuteInscriptionId" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "niveauAuteur" "NiveauAvisEtude" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionMinute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetourCorrection" (
    "id" TEXT NOT NULL,
    "etudeOperationId" TEXT NOT NULL,
    "deNiveau" "NiveauAvisEtude" NOT NULL,
    "versNiveau" "NiveauAvisEtude" NOT NULL,
    "auteurId" TEXT NOT NULL,
    "destinataireId" TEXT NOT NULL,
    "avisSourceId" TEXT,
    "motif" TEXT NOT NULL,
    "dateRetour" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateTraitement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetourCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvisEtude_etudeOperationId_idx" ON "AvisEtude"("etudeOperationId");

-- CreateIndex
CREATE INDEX "AvisEtude_etudeOperationId_niveau_idx" ON "AvisEtude"("etudeOperationId", "niveau");

-- CreateIndex
CREATE INDEX "AvisEtude_auteurId_idx" ON "AvisEtude"("auteurId");

-- CreateIndex
CREATE INDEX "AvisEtude_decision_idx" ON "AvisEtude"("decision");

-- CreateIndex
CREATE INDEX "AvisEtude_createdAt_idx" ON "AvisEtude"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AvisEtude_etudeOperationId_niveau_numeroAvis_key" ON "AvisEtude"("etudeOperationId", "niveau", "numeroAvis");

-- CreateIndex
CREATE INDEX "MotifRefus_avisEtudeId_idx" ON "MotifRefus"("avisEtudeId");

-- CreateIndex
CREATE UNIQUE INDEX "MotifRefus_avisEtudeId_ordre_key" ON "MotifRefus"("avisEtudeId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "MinuteInscription_etudeOperationId_key" ON "MinuteInscription"("etudeOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "MinuteInscription_versionFinaleId_key" ON "MinuteInscription"("versionFinaleId");

-- CreateIndex
CREATE INDEX "MinuteInscription_modePreparation_idx" ON "MinuteInscription"("modePreparation");

-- CreateIndex
CREATE INDEX "VersionMinute_minuteInscriptionId_idx" ON "VersionMinute"("minuteInscriptionId");

-- CreateIndex
CREATE INDEX "VersionMinute_auteurId_idx" ON "VersionMinute"("auteurId");

-- CreateIndex
CREATE INDEX "VersionMinute_createdAt_idx" ON "VersionMinute"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VersionMinute_minuteInscriptionId_numeroVersion_key" ON "VersionMinute"("minuteInscriptionId", "numeroVersion");

-- CreateIndex
CREATE INDEX "RetourCorrection_etudeOperationId_idx" ON "RetourCorrection"("etudeOperationId");

-- CreateIndex
CREATE INDEX "RetourCorrection_auteurId_idx" ON "RetourCorrection"("auteurId");

-- CreateIndex
CREATE INDEX "RetourCorrection_destinataireId_idx" ON "RetourCorrection"("destinataireId");

-- CreateIndex
CREATE INDEX "RetourCorrection_avisSourceId_idx" ON "RetourCorrection"("avisSourceId");

-- CreateIndex
CREATE INDEX "RetourCorrection_dateRetour_idx" ON "RetourCorrection"("dateRetour");

-- CreateIndex
CREATE INDEX "RetourCorrection_dateTraitement_idx" ON "RetourCorrection"("dateTraitement");

-- CreateIndex
CREATE UNIQUE INDEX "EtudeOperation_avisFinalId_key" ON "EtudeOperation"("avisFinalId");

-- AddForeignKey
ALTER TABLE "EtudeOperation" ADD CONSTRAINT "EtudeOperation_avisFinalId_fkey" FOREIGN KEY ("avisFinalId") REFERENCES "AvisEtude"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisEtude" ADD CONSTRAINT "AvisEtude_etudeOperationId_fkey" FOREIGN KEY ("etudeOperationId") REFERENCES "EtudeOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisEtude" ADD CONSTRAINT "AvisEtude_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotifRefus" ADD CONSTRAINT "MotifRefus_avisEtudeId_fkey" FOREIGN KEY ("avisEtudeId") REFERENCES "AvisEtude"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinuteInscription" ADD CONSTRAINT "MinuteInscription_etudeOperationId_fkey" FOREIGN KEY ("etudeOperationId") REFERENCES "EtudeOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinuteInscription" ADD CONSTRAINT "MinuteInscription_versionFinaleId_fkey" FOREIGN KEY ("versionFinaleId") REFERENCES "VersionMinute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionMinute" ADD CONSTRAINT "VersionMinute_minuteInscriptionId_fkey" FOREIGN KEY ("minuteInscriptionId") REFERENCES "MinuteInscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionMinute" ADD CONSTRAINT "VersionMinute_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetourCorrection" ADD CONSTRAINT "RetourCorrection_etudeOperationId_fkey" FOREIGN KEY ("etudeOperationId") REFERENCES "EtudeOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetourCorrection" ADD CONSTRAINT "RetourCorrection_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetourCorrection" ADD CONSTRAINT "RetourCorrection_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetourCorrection" ADD CONSTRAINT "RetourCorrection_avisSourceId_fkey" FOREIGN KEY ("avisSourceId") REFERENCES "AvisEtude"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
