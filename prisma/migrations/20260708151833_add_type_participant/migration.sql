-- CreateEnum
CREATE TYPE "TypeParticipant" AS ENUM ('PARTICIPANT', 'STAFF', 'ENSEIGNANT');

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "typeParticipant" "TypeParticipant" NOT NULL DEFAULT 'PARTICIPANT';
