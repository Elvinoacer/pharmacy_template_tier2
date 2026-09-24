// Never load a developer's normal database or provider credentials for tests.
const databaseUrl = process.env.KYP_TEST_DATABASE_URL ||
  (process.env.CI === "true" ? process.env.DATABASE_URL : undefined);
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
else delete process.env.DATABASE_URL;
delete process.env.DATABASE_HOSTADDR;
process.env.AUTH_SECRET ||= "isolated-test-auth-secret-at-least-32-characters";
process.env.INTEGRATION_SECRET ||= "isolated-test-integration-secret-at-least-32-characters";
