'use client';

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://urmvoqnxjprepsrchntt.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVybXZvcW54anByZXBzcmNobnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MjUzNTksImV4cCI6MjEwOTIwMTM1OX0.wJFVQZNnrHFHZF8Dft_hG8xHs1tZ-YtUcd1rODiVTkY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const SUPABASE_PROJECT_REF = "urmvoqnxjprepsrchntt";
