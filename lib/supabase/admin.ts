import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export function createAdminClient() {
  const { supabaseUrl } = getSupabaseEnv();
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseSecretKey) {
    throw new Error(
      "Missing Supabase secret key: SUPABASE_SECRET_KEY must be set.",
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
    },
  });
}
