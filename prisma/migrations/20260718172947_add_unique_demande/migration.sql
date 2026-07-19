/*
  Warnings:

  - A unique constraint covering the columns `[cin,referenceFonciere]` on the table `Demande` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Demande_cin_referenceFonciere_key" ON "Demande"("cin", "referenceFonciere");
