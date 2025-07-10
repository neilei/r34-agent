import { createClient } from "@supabase/supabase-js";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value;
}

const supabaseProjectId = requireEnv("SUPABASE_PROJECT_ID");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE");

const supabaseUrl = `https://${supabaseProjectId}.supabase.co`;

// Create Supabase client with service role for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
// Venice API configuration - exported for use in nodes and graph
export const VENICE_BASE_URL = "https://api.venice.ai/api/v1/";
export const VENICE_API_KEY = requireEnv("VENICE_API_KEY");
