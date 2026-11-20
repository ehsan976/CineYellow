// Give an existing account the "admin" role (or take it away with --remove).
//   npm run make-admin -- you@example.com
//   npm run make-admin -- you@example.com --remove
// After that, the account can open /admin. Sign out and in again (or wait up to 5 minutes
// for the session cookie cache) so the new role reaches the browser.
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv.includes("--remove") ? "user" : "admin";

if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-admin -- you@example.com [--remove]");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    'UPDATE "user" SET role = $1, updated_at = now() WHERE lower(email) = $2 RETURNING email, role',
    [role, email]
  );
  if (!rows.length) {
    console.error(`No account with the email ${email}. Sign up first, then run this again.`);
    process.exitCode = 1;
  } else {
    console.log(`${rows[0].email} is now "${rows[0].role}".`);
  }
} finally {
  await client.end();
}
