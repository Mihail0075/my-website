process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/pratki_test";
process.env.LOCKER_MODE = "simulated";
process.env.SESSION_SECRET = "test-secret-for-vitest-only";
process.env.APP_URL = "http://test.local";
delete process.env.SMTP_HOST;
