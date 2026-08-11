-- CreateEnum
CREATE TYPE "NatureDemande" AS ENUM ('INSCRIPTION', 'PRESTATION');

-- CreateEnum
CREATE TYPE "CategorieOperationFonciere" AS ENUM ('STANDARD', 'DISTRACTION');

-- CreateEnum
CREATE TYPE "StatutTarification" AS ENUM ('CALCULEE', 'FIGEE');

-- CreateEnum
CREATE TYPE "TypeLigneTarification" AS ENUM ('ARCHIVAGE_DOSSIER', 'ETUDE_OPERATION', 'BASE_PRESTATION', 'TARIFICATION_PAGE', 'SUPPLEMENT_FRANCAIS', 'AUTRE');

-- AlterTable
ALTER TABLE "Demande" ADD COLUMN     "nature" "NatureDemande",
ADD COLUMN     "nombrePages" INTEGER,
ADD COLUMN     "prestationId" TEXT,
ADD COLUMN     "titreFoncierId" TEXT;

-- CreateTable
CREATE TABLE "Gouvernorat" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gouvernorat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitreFoncier" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "gouvernoratId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitreFoncier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypeOperationFonciere" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "categorie" "CategorieOperationFonciere" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypeOperationFonciere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeOperationFonciere" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "typeOperationFonciereId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeOperationFonciere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifOperationFonciere" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieOperationFonciere" NOT NULL,
    "montantEtude" DECIMAL(10,3) NOT NULL,
    "dateDebutValidite" DATE NOT NULL,
    "dateFinValidite" DATE,
    "referenceReglementaire" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarifOperationFonciere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifInscription" (
    "id" TEXT NOT NULL,
    "montantArchivage" DECIMAL(10,3) NOT NULL,
    "dateDebutValidite" DATE NOT NULL,
    "dateFinValidite" DATE,
    "referenceReglementaire" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarifInscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "tarificationParPage" BOOLEAN NOT NULL DEFAULT false,
    "supplementFrancaisApplicable" BOOLEAN NOT NULL DEFAULT false,
    "necessiteTitreFoncier" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifPrestation" (
    "id" TEXT NOT NULL,
    "prestationId" TEXT NOT NULL,
    "montantBase" DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    "montantParPage" DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    "supplementFrancais" DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    "dateDebutValidite" DATE NOT NULL,
    "dateFinValidite" DATE,
    "referenceReglementaire" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarifPrestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarificationDemande" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "nature" "NatureDemande" NOT NULL,
    "prestationCode" TEXT,
    "prestationLibelle" TEXT,
    "langue" "LangueCertificat",
    "nombrePages" INTEGER,
    "montantTotal" DECIMAL(10,3) NOT NULL,
    "referenceReglementaire" TEXT,
    "statut" "StatutTarification" NOT NULL DEFAULT 'CALCULEE',
    "dateCalcul" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFigeage" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarificationDemande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneTarification" (
    "id" TEXT NOT NULL,
    "tarificationId" TEXT NOT NULL,
    "type" "TypeLigneTarification" NOT NULL,
    "code" TEXT,
    "libelle" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "montantUnitaire" DECIMAL(10,3) NOT NULL,
    "montant" DECIMAL(10,3) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneTarification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gouvernorat_code_key" ON "Gouvernorat"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Gouvernorat_nom_key" ON "Gouvernorat"("nom");

-- CreateIndex
CREATE INDEX "TitreFoncier_numero_idx" ON "TitreFoncier"("numero");

-- CreateIndex
CREATE INDEX "TitreFoncier_gouvernoratId_idx" ON "TitreFoncier"("gouvernoratId");

-- CreateIndex
CREATE UNIQUE INDEX "TitreFoncier_numero_gouvernoratId_key" ON "TitreFoncier"("numero", "gouvernoratId");

-- CreateIndex
CREATE UNIQUE INDEX "TypeOperationFonciere_code_key" ON "TypeOperationFonciere"("code");

-- CreateIndex
CREATE INDEX "TypeOperationFonciere_categorie_idx" ON "TypeOperationFonciere"("categorie");

-- CreateIndex
CREATE INDEX "TypeOperationFonciere_actif_idx" ON "TypeOperationFonciere"("actif");

-- CreateIndex
CREATE INDEX "DemandeOperationFonciere_demandeId_idx" ON "DemandeOperationFonciere"("demandeId");

-- CreateIndex
CREATE INDEX "DemandeOperationFonciere_typeOperationFonciereId_idx" ON "DemandeOperationFonciere"("typeOperationFonciereId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeOperationFonciere_demandeId_typeOperationFonciereId_key" ON "DemandeOperationFonciere"("demandeId", "typeOperationFonciereId");

-- CreateIndex
CREATE INDEX "TarifOperationFonciere_categorie_idx" ON "TarifOperationFonciere"("categorie");

-- CreateIndex
CREATE INDEX "TarifOperationFonciere_categorie_dateDebutValidite_idx" ON "TarifOperationFonciere"("categorie", "dateDebutValidite");

-- CreateIndex
CREATE INDEX "TarifInscription_dateDebutValidite_idx" ON "TarifInscription"("dateDebutValidite");

-- CreateIndex
CREATE UNIQUE INDEX "Prestation_code_key" ON "Prestation"("code");

-- CreateIndex
CREATE INDEX "Prestation_actif_idx" ON "Prestation"("actif");

-- CreateIndex
CREATE INDEX "TarifPrestation_prestationId_idx" ON "TarifPrestation"("prestationId");

-- CreateIndex
CREATE INDEX "TarifPrestation_prestationId_dateDebutValidite_idx" ON "TarifPrestation"("prestationId", "dateDebutValidite");

-- CreateIndex
CREATE UNIQUE INDEX "TarificationDemande_demandeId_key" ON "TarificationDemande"("demandeId");

-- CreateIndex
CREATE INDEX "TarificationDemande_statut_idx" ON "TarificationDemande"("statut");

-- CreateIndex
CREATE INDEX "TarificationDemande_dateCalcul_idx" ON "TarificationDemande"("dateCalcul");

-- CreateIndex
CREATE INDEX "LigneTarification_tarificationId_idx" ON "LigneTarification"("tarificationId");

-- CreateIndex
CREATE INDEX "LigneTarification_type_idx" ON "LigneTarification"("type");

-- CreateIndex
CREATE INDEX "Demande_nature_idx" ON "Demande"("nature");

-- CreateIndex
CREATE INDEX "Demande_titreFoncierId_idx" ON "Demande"("titreFoncierId");

-- CreateIndex
CREATE INDEX "Demande_prestationId_idx" ON "Demande"("prestationId");

-- AddForeignKey
ALTER TABLE "TitreFoncier" ADD CONSTRAINT "TitreFoncier_gouvernoratId_fkey" FOREIGN KEY ("gouvernoratId") REFERENCES "Gouvernorat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeOperationFonciere" ADD CONSTRAINT "DemandeOperationFonciere_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeOperationFonciere" ADD CONSTRAINT "DemandeOperationFonciere_typeOperationFonciereId_fkey" FOREIGN KEY ("typeOperationFonciereId") REFERENCES "TypeOperationFonciere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifPrestation" ADD CONSTRAINT "TarifPrestation_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "Prestation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_titreFoncierId_fkey" FOREIGN KEY ("titreFoncierId") REFERENCES "TitreFoncier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "Prestation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarificationDemande" ADD CONSTRAINT "TarificationDemande_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneTarification" ADD CONSTRAINT "LigneTarification_tarificationId_fkey" FOREIGN KEY ("tarificationId") REFERENCES "TarificationDemande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
