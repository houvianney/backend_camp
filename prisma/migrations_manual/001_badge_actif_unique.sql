-- A executer APRES la premiere migration Prisma (npx prisma migrate dev).
-- Prisma ne sait pas exprimer un index unique partiel (clause WHERE),
-- donc on l'ajoute a la main juste apres la generation du schema.
--
-- Garantit qu'un participant ne peut jamais avoir 2 badges avec statut ACTIF
-- en meme temps (protection supplementaire en plus de la transaction
-- utilisee dans BadgesService.regenererBadge).

CREATE UNIQUE INDEX IF NOT EXISTS "Badge_participantId_actif_unique"
ON "Badge" ("participantId")
WHERE "statut" = 'ACTIF';
