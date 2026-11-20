import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const envFile = `${root}/.env.local`;
for (const line of readFileSync(envFile, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { autoRefreshToken: false } });

const { data, error } = await sb.from("offers").select("*").limit(1);
if (error) { console.error("ERR", error.message); process.exit(1); }
const row = (data && data[0]) || {};
const out = Object.keys(row).map((k) => `${k} (value)`).join("\n");
writeFileSync("offers-schema.txt", out + "\n");
console.log("wrote offers-schema.txt");