import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Use placeholder only for build-time, but warn in runtime
const isPlaceholder = !supabaseUrl || !supabaseAnonKey || 
  supabaseUrl.includes("placeholder") || 
  supabaseAnonKey.includes("placeholder");

if (isPlaceholder && typeof window !== "undefined") {
  console.warn(
    "Supabase env vars are missing. " +
    "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
  );
}

// Create client with actual values or empty strings (will fail gracefully)
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);
