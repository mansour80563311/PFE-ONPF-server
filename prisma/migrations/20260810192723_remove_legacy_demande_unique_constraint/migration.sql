-- DropIndex
DROP INDEX "Demande_cin_referenceFonciere_key";

-- CreateIndex
CREATE INDEX "Demande_referenceFonciere_idx" ON "Demande"("referenceFonciere");
