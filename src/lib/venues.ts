import { getSupabase } from "./supabase";
import type { Venue } from "./types";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMxih2SsybskeLkCCx-HNENiyM3fY3QaLj7Z_uw-Qw-kp7a91cShfW45Y9IZTd6bKYv-1-MTOVoWFH/pub?gid=0&single=true&output=csv";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function safeUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return url;
    }
  } catch {
    // invalid URL
  }
  return null;
}

function csvRowToVenue(row: Record<string, string>, id: number): Venue | null {
  const name = row["RestaurantName"]?.trim();
  const deal = row["Deal"]?.trim();
  if (!name || !deal) return null;

  const lat = parseFloat(row["Latitude"] || "");
  const lng = parseFloat(row["Longitude"] || "");
  const hasCoords =
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  return {
    id,
    restaurant_name: name,
    deal,
    neighborhood: row["Neighborhood"]?.trim() || "Other",
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
    restaurant_url: safeUrl(row["RestaurantURL"]?.trim()),
    maps_url: safeUrl(row["MapsURL"]?.trim()),
    mon: (row["Mon"] || "").trim().toLowerCase() === "yes",
    tue: (row["Tue"] || "").trim().toLowerCase() === "yes",
    wed: (row["Wed"] || "").trim().toLowerCase() === "yes",
    thu: (row["Thu"] || "").trim().toLowerCase() === "yes",
    fri: (row["Fri"] || "").trim().toLowerCase() === "yes",
  };
}

async function fetchFromCSV(): Promise<Venue[]> {
  const res = await fetch(CSV_URL, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const rows = parseCSV(text);

  const venues: Venue[] = [];
  let id = 0;
  for (const row of rows) {
    const venue = csvRowToVenue(row, id);
    if (venue) {
      venues.push(venue);
      id++;
    }
  }

  return venues.sort((a, b) =>
    a.neighborhood.toLowerCase().localeCompare(b.neighborhood.toLowerCase())
  );
}

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
  const supabase = getSupabase();

  if (supabase) {
    try {
      return await fetchFromSupabase();
    } catch {
      console.warn("Supabase fetch failed, falling back to CSV");
      return await fetchFromCSV();
    }
  }

  return await fetchFromCSV();
}
