import { NextResponse } from "next/server";
import { getVenues } from "@/lib/venues";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ExistingDeal, DaySchedule, ExtractedDeal } from "@/lib/deal-types";

export async function GET() {
  try {
    const venues = await getVenues();

    // Convert Venue[] to ExistingDeal[] format for the Deal Updater
    const deals: ExistingDeal[] = venues.map((v) => ({
      id: String(v.id),
      restaurant_name: v.restaurant_name,
      deal_description: v.deal,
      days: {
        monday: v.mon,
        tuesday: v.tue,
        wednesday: v.wed,
        thursday: v.thu,
        friday: v.fri,
        saturday: false,
        sunday: false,
      } as DaySchedule,
      neighborhood: v.neighborhood,
      last_updated: new Date().toISOString(),
      latitude: v.latitude,
      longitude: v.longitude,
    }));

    return NextResponse.json(deals);
  } catch (error) {
    console.error("Failed to fetch venues:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    // Require authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: { extractedData: ExtractedDeal; matchedVenueId?: string | null } = await request.json();
    const { extractedData, matchedVenueId } = body;

    // Geocode via Google Places API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    let lat: number | null = null;
    let lng: number | null = null;
    let restaurant_url: string | null = null;
    let maps_url: string | null = null;
    let neighborhood: string = extractedData.google_place?.neighborhood ?? "";

    if (apiKey && extractedData.restaurant_name) {
      try {
        const query = encodeURIComponent(`${extractedData.restaurant_name} Atlanta`);
        const textSearchRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`,
          { headers: { Referer: 'https://socializers-happyhour-frontend.vercel.app/' } }
        );
        const textSearchData = await textSearchRes.json();
        const placeId = textSearchData?.results?.[0]?.place_id;

        if (placeId) {
          const detailsRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,website,formatted_address,address_components,url&key=${apiKey}`,
            { headers: { Referer: 'https://socializers-happyhour-frontend.vercel.app/' } }
          );
          const detailsData = await detailsRes.json();
          const result = detailsData?.result;

          if (result) {
            lat = result.geometry?.location?.lat ?? null;
            lng = result.geometry?.location?.lng ?? null;
            restaurant_url = result.website ?? null;
            maps_url = result.url ?? null;

            // Extract neighborhood from address_components
            const components: { types: string[]; long_name: string }[] = result.address_components ?? [];
            const neighborhoodComp = components.find((c) => c.types.includes("neighborhood"))
              ?? components.find((c) => c.types.includes("sublocality_level_1"));
            if (neighborhoodComp) {
              neighborhood = neighborhoodComp.long_name;
            }
          }
        }
      } catch (geocodeErr) {
        console.error("Geocoding failed, proceeding without coordinates:", geocodeErr);
      }
    }

    // Map days to venue columns
    const { days } = extractedData;
    const venueRow = {
      restaurant_name: extractedData.restaurant_name,
      deal: extractedData.deal_description,
      neighborhood: neighborhood || null,
      latitude: lat,
      longitude: lng,
      restaurant_url,
      maps_url,
      mon: days.monday,
      tue: days.tuesday,
      wed: days.wednesday,
      thu: days.thursday,
      fri: days.friday,
    };

    const admin = createAdminClient();
    let savedRow;

    if (matchedVenueId) {
      const { data, error } = await admin
        .from("venues")
        .update(venueRow)
        .eq("id", matchedVenueId)
        .select()
        .single();
      if (error) throw error;
      savedRow = data;
    } else {
      const { data, error } = await admin
        .from("venues")
        .insert(venueRow)
        .select()
        .single();
      if (error) throw error;
      savedRow = data;
    }

    return NextResponse.json({ success: true, venue: savedRow });
  } catch (error) {
    console.error("Failed to save venue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save venue" },
      { status: 500 }
    );
  }
}
