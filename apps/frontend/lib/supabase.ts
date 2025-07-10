import { createClient } from "@supabase/supabase-js";
import { Database } from "./__generated__/database.types";
import { requireEnv } from "./utils";

const supabaseProjectId = requireEnv("SUPABASE_PROJECT_ID");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE");

const supabaseUrl = `https://${supabaseProjectId}.supabase.co`;

// Create Supabase client with service role for server-side operations
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
