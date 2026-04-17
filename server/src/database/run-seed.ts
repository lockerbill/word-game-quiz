import '../env.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { SeedService } from './seed.service.js';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const seedService = app.get(SeedService);
    await seedService.seedAll();
  } finally {
    await app.close();
  }
}

void runSeed().catch((error: unknown) => {
  console.error('Database seed failed.', error);
  process.exit(1);
});
