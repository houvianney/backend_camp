import { PrismaClient, Role, ControleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // --- Admin par defaut ---
  const passwordHash = await bcrypt.hash('ChangeMoi123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@evenement.local' },
    update: {},
    create: {
      nom: 'Principal',
      prenom: 'Administrateur',
      email: 'admin@evenement.local',
      passwordHash,
      passwordPlain: 'ChangeMoi123!',
      role: Role.ADMIN,
    },
  });

  // --- Ressources de base (a adapter selon la duree reelle du camp) ---
  const ressources = [
    { code: 'presence', libelle: 'Presence sur le lieu', type: ControleType.PRESENCE },
    { code: 'tshirt', libelle: 'T-shirt evenement', type: ControleType.TSHIRT },
    { code: 'repas_j1_soir', libelle: 'Repas Jour 1 - Soir', jour: 1, creneau: 'soir', type: ControleType.NOURRITURE },
    { code: 'repas_j2_matin', libelle: 'Repas Jour 2 - Matin', jour: 2, creneau: 'matin', type: ControleType.NOURRITURE },
    { code: 'repas_j2_midi', libelle: 'Repas Jour 2 - Midi', jour: 2, creneau: 'midi', type: ControleType.NOURRITURE },
    { code: 'repas_j3_soir', libelle: 'Repas Jour 3 - Soir', jour: 3, creneau: 'soir', type: ControleType.NOURRITURE },
    { code: 'repas_j3_matin', libelle: 'Repas Jour 3 - Matin', jour: 3, creneau: 'matin', type: ControleType.NOURRITURE },
    { code: 'repas_j3_midi', libelle: 'Repas Jour 3 - Midi', jour: 3, creneau: 'midi', type: ControleType.NOURRITURE },
    { code: 'repas_j3_soir', libelle: 'Repas Jour 3 - Soir', jour: 3, creneau: 'soir', type: ControleType.NOURRITURE },
    { code: 'repas_j4_matin', libelle: 'Repas Jour 4 - Matin', jour: 4, creneau: 'matin', type: ControleType.NOURRITURE },
    { code: 'repas_j4_midi', libelle: 'Repas Jour 4 - Midi', jour: 4, creneau: 'midi', type: ControleType.NOURRITURE },
    { code: 'repas_j4_soir', libelle: 'Repas Jour 4 - Soir', jour: 4, creneau: 'soir', type: ControleType.NOURRITURE },
  ];

  for (const r of ressources) {
    await prisma.ressource.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
  }

  // --- Localite d'exemple ---
  await prisma.localite.upsert({
    where: { id: 'exemple-localite' },
    update: {},
    create: {
      id: 'exemple-localite',
      nom: 'Localite Exemple (a remplacer)',
      description: 'Localite creee automatiquement par le seed, a adapter/supprimer',
    },
  });

  console.log('Seed termine.');
  console.log('Admin: admin@evenement.local / ChangeMoi123! (a changer immediatement apres premiere connexion)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
