import { getSupabase } from "./supabase";
import type { Venue } from "./types";

async function fetchFromSupabase(): Promise<Venue[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("neighborhood", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Venue[];
}

export async function getVenues(): Promise<Venue[]> {
  return await fetchFromSupabase();
}
