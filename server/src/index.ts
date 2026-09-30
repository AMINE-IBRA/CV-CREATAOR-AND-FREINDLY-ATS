import { createApp } from './app';
import { config } from './lib/config';
import { prisma } from './lib/prisma';

const host = process.env.HOST || (config.production ? '0.0.0.0' : '127.0.0.1');
const server = createApp().listen(config.port, host, () => {
  console.log(`CV Creator Pro API listening on http://${host}:${config.port}`);
});
async function shutdown() {
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
export default server;
