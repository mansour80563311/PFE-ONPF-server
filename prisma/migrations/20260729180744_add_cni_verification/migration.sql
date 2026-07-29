-- CreateEnum
CREATE TYPE "StatutVerificationCni" AS ENUM ('NON_VERIFIEE', 'VERIFIEE', 'ECHEC', 'INDISPONIBLE');

-- AlterTable
ALTER TABLE "Demande" ADD COLUMN     "adresseDemandeur" TEXT,
ADD COLUMN     "dateNaissanceDemandeur" DATE,
ADD COLUMN     "dateVerificationCni" TIMESTAMP(3),
ADD COLUMN     "messageVerificationCni" TEXT,
ADD COLUMN     "referenceVerificationCni" TEXT,
ADD COLUMN     "sourceVerificationCni" TEXT,
ADD COLUMN     "statutVerificationCni" "StatutVerificationCni" NOT NULL DEFAULT 'NON_VERIFIEE';

-- CreateIndex
CREATE INDEX "Demande_cin_idx" ON "Demande"("cin");

-- CreateIndex
CREATE INDEX "Demande_statutVerificationCni_idx" ON "Demande"("statutVerificationCni");
