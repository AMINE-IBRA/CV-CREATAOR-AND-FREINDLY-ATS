// Read-only owner lookup. Run against the intended database, not a fresh local DB.
const path = require('node:path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env'), quiet: true });
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const db = new PrismaClient();
const email = process.argv[2];
if (!email || !email.includes('@')) { console.error('Usage: node scripts/owner-account.cjs OWNER_LOGIN_EMAIL'); process.exit(1); }
(async () => {
  const users = await db.$queryRaw`SELECT id, email FROM "User" WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`;
  if (!users.length) { console.error('Account not found in this database.'); process.exitCode = 1; return; }
  console.log('OWNER_USER_IDS=' + users[0].id);
})().catch(() => { console.error('Could not read the account. Check DATABASE_URL and migrations.'); process.exitCode = 1; }).finally(() => db.$disconnect());
