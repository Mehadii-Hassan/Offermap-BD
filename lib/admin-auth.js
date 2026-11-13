import { cookies } from "next/headers";

export const ADMIN_COOKIE = "om_admin";

// Verify the admin cookie. Route handlers call this at the top.
export function requireAdmin() {
  const store = cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  // Sign the cookie with the password hash so it's not trivially forgeable.
  const expected = signToken();
  return token === expected;
}

export function signToken() {
  const secret = process.env.ADMIN_PASSWORD || "";
  // Deterministic signature using Node's crypto (works with async-adjacent sync API).
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(`om:${secret}`).digest("hex");
}