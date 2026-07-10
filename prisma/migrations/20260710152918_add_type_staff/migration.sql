-- AlterEnum
ALTER TYPE "TypeParticipant" ADD VALUE 'VOLONTAIRE';

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "typeStaff" TEXT;
