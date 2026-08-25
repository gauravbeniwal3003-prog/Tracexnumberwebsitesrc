import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nooplqxbfskgwjlpuutr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb3BscXhiZnNrZ3dqbHB1dXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcxMTAsImV4cCI6MjA5MzU4MzExMH0.oGnMxO4JvALvOGnSSqoeOmpxJMUWQ__Fe3LcZCu_er0";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = "5f66534b-de6b-4ef9-9a08-816a86ab1c99";
  console.log(`=== Querying database records for user ID ${userId} ===`);

  const { data: profile, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  console.log("\n--- Profile:", profile, pErr);

  const { data: appUser, error: aErr } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  console.log("\n--- App User:", appUser, aErr);
}

run().catch(console.error);
