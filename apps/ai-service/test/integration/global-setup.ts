import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';
import { execSync } from 'child_process';
import path from 'path';

declare global {
  // eslint-disable-next-line no-var
  var __pg_container__: StartedPostgreSqlContainer;
}

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('ks_ai_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  global.__pg_container__ = container;

  const dbUrl      = container.getConnectionUri();
  const schemaPath = path.resolve(__dirname, '../../../../packages/db/prisma/schema.prisma');

  execSync(`pnpm prisma migrate deploy --schema=${schemaPath}`, {
    env:   { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit',
  });

  process.env.TEST_DATABASE_URL = dbUrl;
}
