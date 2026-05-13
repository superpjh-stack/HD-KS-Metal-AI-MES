import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';
import { execSync } from 'child_process';
import path from 'path';

declare global {
  // eslint-disable-next-line no-var
  var __pg_container__: StartedPostgreSqlContainer;
}

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('ks_mes_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const dbUrl = container.getConnectionUri();

  // Store for teardown
  global.__pg_container__ = container;
  process.env.DATABASE_URL = dbUrl;

  // Run Prisma migrations against the test container
  const schemaPath = path.resolve(__dirname, '../../../../packages/db/prisma/schema.prisma');
  execSync(`pnpm prisma migrate deploy --schema=${schemaPath}`, {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit',
  });

  // Expose URL for test files via process.env (jest workers inherit it)
  process.env.TEST_DATABASE_URL = dbUrl;
}
