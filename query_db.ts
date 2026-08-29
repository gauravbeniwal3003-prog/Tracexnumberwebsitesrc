import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nooplqxbfskgwjlpuutr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb3BscXhiZnNrZ3dqbHB1dXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcxMTAsImV4cCI6MjA5MzU4MzExMH0.oGnMxO4JvALvOGnSSqoeOmpxJMUWQ__Fe3LcZCu_er0";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const nowStr = new Date().toISOString();
  console.log(`Current Time: ${nowStr}`);

  // 1. Fetch active profiles with unlimited_expiry in the future
  console.log("\n=== Fetching profiles with active unlimited_expiry ===");
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("id, email, unlimited_expiry, full_name")
    .gt("unlimited_expiry", nowStr);

  if (pErr) {
    console.error("Error fetching profiles:", pErr);
    return;
  }

  console.log(`Found ${profiles?.length || 0} profiles with active unlimited plans:`);
  console.log(profiles);

  if (profiles && profiles.length > 0) {
    console.log("\n=== Expiring active unlimited plans for profiles ===");
    for (const prof of profiles) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ unlimited_expiry: null })
        .eq("id", prof.id)
        .select();

      if (error) {
        console.error(`Error expiring profile ${prof.email}:`, error);
      } else {
        console.log(`Successfully expired unlimited plan for profile: ${prof.email}`);
      }
    }
  }

  // 2. Fetch active api_keys with unlimited plans (e.g. status active, and plan includes unlimited or 600, or expires in future)
  console.log("\n=== Fetching api_keys with active unlimited/future plans ===");
  const { data: apiKeys, error: kErr } = await supabaseAdmin
    .from("api_keys")
    .select("id, api_key, user_email, plan_name, expires_at, status")
    .eq("status", "active")
    .gt("expires_at", nowStr);

  if (kErr) {
    console.error("Error fetching api_keys:", kErr);
    return;
  }

  console.log(`Found ${apiKeys?.length || 0} active API keys with future expiration:`);
  console.log(apiKeys);

  if (apiKeys && apiKeys.length > 0) {
    console.log("\n=== Expiring active unlimited/future API Keys ===");
    for (const key of apiKeys) {
      // We expire them by setting expires_at to a past date (now) or null
      const pastDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // 1 day ago
      const { error } = await supabaseAdmin
        .from("api_keys")
        .update({ expires_at: pastDate, status: "expired" })
        .eq("id", key.id);

      if (error) {
        console.error(`Error expiring API key ${key.api_key} (${key.user_email}):`, error);
      } else {
        console.log(`Successfully expired API Key ${key.api_key} for user ${key.user_email}`);
      }
    }
  }
}

run().catch(console.error);

