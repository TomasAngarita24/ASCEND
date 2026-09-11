import { app } from './app';
import { env } from './config/env';
import { prisma } from './database/prisma';

import { startReminderScheduler, stopReminderScheduler } from './modules/push/push.scheduler';

const server = app.listen(env.port, '0.0.0.0', () => {
  startReminderScheduler();
  console.log(`ASCEND backend listening on 0.0.0.0:${env.port} in ${env.nodeEnv} mode.`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}; shutting down gracefully.`);

  stopReminderScheduler();

  server.close(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(0);
    });
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
