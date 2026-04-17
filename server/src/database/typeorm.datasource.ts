import '../env.js';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/alphabucks';

const shouldUseSsl =
  process.env.DATABASE_SSL === 'true' ||
  process.env.DATABASE_REQUIRE_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  entities: [
    resolve(process.cwd(), 'src/entities/*.entity.ts'),
    resolve(process.cwd(), 'dist/entities/*.entity.js'),
  ],
  migrations: [
    resolve(process.cwd(), 'src/database/migrations/*.ts'),
    resolve(process.cwd(), 'dist/database/migrations/*.js'),
  ],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
