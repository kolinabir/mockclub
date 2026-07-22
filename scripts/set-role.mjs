/**
 * Promote a user to a role. Better Auth has no bootstrap admin, so the first
 * one is set here, once, after they've signed in with Google.
 *
 *   node scripts/set-role.mjs you@example.com admin
 *   node scripts/set-role.mjs you@example.com candidate,interviewer,admin
 *
 * Roles are a COMMA-SEPARATED string — that's Better Auth's native format for
 * multiple roles, not a workaround.
 */
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const [email, role] = process.argv.slice(2);
if (!email || !role) {
  console.error("Usage: node scripts/set-role.mjs <email> <role[,role2]>");
  process.exit(1);
}

const uri = readFileSync(".env.local", "utf8").match(
  /^MONGODB_URI=["']?([^"'\n]+)/m
)?.[1];
if (!uri) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const users = client.db().collection("user");

const res = await users.findOneAndUpdate(
  { email: email.toLowerCase() },
  { $set: { role } },
  { returnDocument: "after" }
);

if (!res) {
  console.error(`No user with email ${email}. Sign in with Google first, then re-run.`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${res.email} → role: "${res.role}"`);
}

await client.close();
