// Refuses to run unless .env.test explicitly opted in, so a missing file can never
// point these tests (which create and delete data) at the dev or production database.
if (process.env.INTEGRATION_TEST_DB !== "1") {
  throw new Error(
    "Integration tests need .env.test with INTEGRATION_TEST_DB=1 (Neon TEST branch).",
  );
}
