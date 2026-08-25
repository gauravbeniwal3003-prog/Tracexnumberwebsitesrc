import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nooplqxbfskgwjlpuutr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb3BscXhiZnNrZ3dqbHB1dXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcxMTAsImV4cCI6MjA5MzU4MzExMH0.oGnMxO4JvALvOGnSSqoeOmpxJMUWQ__Fe3LcZCu_er0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  console.log("=== Inspecting payment_claims ===");
  const { data: claims, error: claimsErr } = await supabase.from("payment_claims").select("*").limit(5);
  if (claimsErr) console.error("payment_claims Err:", claimsErr);
  else console.log("payment_claims keys:", Object.keys(claims[0] || {}));

  console.log("\n=== Inspecting wallet_transactions ===");
  const { data: txs, error: txsErr } = await supabase.from("wallet_transactions").select("*").limit(5);
  if (txsErr) console.error("wallet_transactions Err:", txsErr);
  else console.log("wallet_transactions keys:", Object.keys(txs[0] || {}));

  console.log("\n=== Inspecting profiles ===");
  const { data: profiles, error: profilesErr } = await supabase.from("profiles").select("*").limit(5);
  if (profilesErr) console.error("profiles Err:", profilesErr);
  else console.log("profiles keys:", Object.keys(profiles[0] || {}));

  console.log("\n=== Inspecting app_users ===");
  const { data: appUsers, error: appUsersErr } = await supabase.from("app_users").select("*").limit(5);
  if (appUsersErr) console.error("appUsers Err:", appUsersErr);
  else console.log("appUsers keys:", Object.keys(appUsers[0] || {}));
}

inspect().catch(console.error);
