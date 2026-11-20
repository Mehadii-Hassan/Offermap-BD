const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { autoRefreshToken: false } });

(async () => {
  const { data, error } = await sb
    .from("information_schema.columns")
    .select("column_name, data_type")
    .eq("table_name", "offers");
  if (error) { console.error("ERR", error.message); process.exit(1); }
  const out = (data || []).map((r) => `${r.column_name} (${r.data_type})`).join("\n");
  require("fs").writeFileSync("offers-schema.txt", out + "\n");
  console.log("wrote offers-schema.txt");
})().catch((e) => { console.error(e); process.exit(1); });