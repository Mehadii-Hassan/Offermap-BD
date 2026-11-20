import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const e2eFixture = test.extend({
  async e2eSetup({}, use) {
    // Clean up leftovers with source 'e2e' at start
    const sb = await supabaseAdmin.from("offers").delete().eq("source", "e2e");
    await sb.execute();

    // Create main offer "E2E Test Chain" with source 'e2e'
    const uttaralng = 90.3795;
    const uttaralat = 23.8759;
    const sylhetlng = 91.8706;
    const sylhetlat = 24.9017;

    const mainOffer = {
      title: "E2E Test Chain",
      shop_name: "E2E Test Shop",
      category: "food",
      division: "Dhaka",
      district: "Uttara",
      area: "Uttara",
      address: "Uttara, Dhaka",
      lat: uttaralat,
      lng: uttaralng,
      discount_text: "10%",
      description: "Test chain offer for e2e testing",
      valid_till: "2026-12-31",
      payment_method: "Any",
      image: null,
      is_featured: false,
      is_ongoing: false,
      hot_score: 0,
      source: "e2e",
      source_url: null,
      status: "approved",
      worked_count: 0,
      not_worked_count: 0,
    };

    const { data: offer1, error: err1 } = await supabaseAdmin.from("offers").insert([row]).select().single();
    if (err1) throw err1;

    // Create 2 outlets for the main offer
    const outlets1 = [
      {
        offer_id: offer1.id,
        name: "Uttara Outlet 1",
        lat: uttaralat,
        lng: uttaralng,
        address: "Uttara, Dhaka",
        area: "Uttara",
        source: "osm",
      },
      {
        offer1.id,
        name: "Uttara Outlet 2",
        lat: uttaralat + 0.0001,
        lng: uttaralng + 0.0001,
        address: "Uttara, Dhaka",
        area: "Uttara",
        source: "osm",
      },
    ];

    const { data: offer1data, error: err11 } = await supabaseAdmin.from("offers").select().eq("id", offer1.id).single();
    if (err11) throw err11;

    const { data: outlets1, error: err12 } = await supabaseAdmin.from("offer_outlets").insert(outlets1).select().single();
    if (err12) throw err12;

    // Create district-precision offer (elsewhere in)
    const sylhetData = {
      title: "District Precision Offer",
      shop_name: "District Precision Shop",
      category: "food",
      division: "Sylhet",
      district: "Sylhet",
      area: "Sylhet",
      address: "Sylhet, Sylhet",
      lat: sylhetlat,
      lng: sylhetlng,
      discount_text: "15%",
      description: "District-precision offer for e2e testing",
      valid_till: "2026-12-31",
      payment_method: "Any",
      image: null,
      is_featured: false,
      is_ongoing: false,
      hot_score: 0,
      source: "e2e",
      source_url: null,
      status: "approved",
      worked_count: 0,
      not_worked_count: 0,
      location_precision: "district",
    };

    const { data: offer2, error: err13 } = await supabaseAdmin.from("offers").insert([row]).select().single();
    if (err13) throw err13;

    const { data: outlets2, error: err14 } = await supabaseAdmin.from("offer_outlets").insert([outlets1[0], outlets1[1], outlets2]).select().single();
    if (err14) throw err14;

    // Mark this fixture as ready
    await use({ e2eFixture: true });
  },

  async e2eTeardown({}, use) {
    // Clean up the test fixtures at the end
    const sb = await supabaseAdmin.from("offers").delete().eq("source", "e2e");
    await sb.execute();
  }
});

async function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = await createClient(url, key, { auth: { autoRefreshToken: false } });
  return sb;
}