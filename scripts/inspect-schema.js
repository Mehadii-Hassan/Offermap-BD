import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const { data, error } = await supabaseAdmin
  .from("information_schema.columns")
  .select("column_name, data_type")
  .eq("table_name", "offers");

if (error) {
  console.error("ERR", error.message);
  process.exit(1);
}
const out = (data || []).map((r) => `${r.column_name} (${r.data_type})`).join("\n");
require("fs").writeFileSync("offers-schema.txt", out + "\n");
console.log("wrote offers-schema.txt");