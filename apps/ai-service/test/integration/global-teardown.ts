export default async function globalTeardown() {
  await global.__pg_container__?.stop();
}
