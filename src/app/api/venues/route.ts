import { NextResponse } from "next/server";
import { getVenues } from "@/lib/venues";
import type { ExistingDeal, DaySchedule } from "@/lib/deal-types";

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
