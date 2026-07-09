-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "contact" TEXT,
ADD COLUMN     "membreOng" BOOLEAN DEFAULT false,
ADD COLUMN     "profession" TEXT;
