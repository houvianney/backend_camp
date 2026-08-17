/*
  Warnings:

  - A unique constraint covering the columns `[anonymousNumber]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "anonymousNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Participant_anonymousNumber_key" ON "Participant"("anonymousNumber");
