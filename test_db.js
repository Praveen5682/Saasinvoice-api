require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ DB connected OK');
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('DB info:', result);
  } catch (e) {
    console.error('❌ DB ERROR:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
