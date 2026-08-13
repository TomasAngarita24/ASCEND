import { app } from './app';
import { env } from './config/env';
import { prisma } from './database/prisma';

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`ASCEND backend listening on 0.0.0.0:${env.port} in ${env.nodeEnv} mode.`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}; shutting down gracefully.`);

  server.close(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(0);
    });
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
