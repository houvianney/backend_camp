process.env.DEBUG = 'prisma:*';
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });
  try {
    // attach query listener to capture generated SQL
    prisma.$on('query', (e) => {
      console.log('PRISMA_QUERY:', e.query);
      console.log('PRISMA_PARAMS:', e.params);
    });

    console.log('Prisma keys:', Object.keys(prisma));
    console.log('Runtime models type:', typeof prisma._runtimeDataModel.models, prisma._runtimeDataModel.models?.constructor?.name);
    console.log('Runtime models object keys:', Object.keys(prisma._runtimeDataModel.models));

    // Reproduce the failing query: list participants for a non-existent localiteId
    console.log('Running participant.findMany reproduction...');
    await prisma.participant.findMany({ where: { localiteId: 'test-localite' }, orderBy: { createdAt: 'desc' } });
    console.log('Reproduction completed successfully (no error)');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
