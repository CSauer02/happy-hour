import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude API key not configured" },
      { status: 503 }
    );
  }

  const { images, textInput, restaurantName } = await req.json();

  // Build Claude message content
  const content: Array<Record<string, unknown>> = [];

  // Add images if provided (base64 encoded)
  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (img.base64 && img.mediaType) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType,
            data: img.base64,
          },
        });
      }
    }
  }

  const prompt = `You extract happy hour information from text and images.

Analyze ${images?.length > 0 ? "the provided images and " : ""}the following information to extract restaurant happy hour details:

Restaurant Name: "${restaurantName || ""}"
Deal Description: "${textInput || ""}"

Return ONLY a JSON object with this exact structure:
{
  "restaurant_name": "extracted or provided restaurant name",
  "deal_description": "detailed happy hour description with times, prices, and items",
  "days": {
    "monday": true/false,
    "tuesday": true/false,
    "wednesday": true/false,
    "thursday": true/false,
    "friday": true/false,
    "saturday": true/false,
    "sunday": true/false
  },
  "confidence": 0.85,
  "google_place": {
    "name": "restaurant name for Google search",
    "neighborhood": "estimated Atlanta neighborhood",
    "address": "estimated address if mentioned",
    "rating": null
  }
}

Focus on:
- Accurate times (like "4-6 PM" or "Monday-Friday 5-7 PM")
- Specific prices and items
- Which days the deal applies to
- Any restrictions or conditions

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

  content.push({ type: "text", text: prompt });

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Claude API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    let responseText = data.content[0].text;

    // Clean up response to extract JSON
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const extracted = JSON.parse(responseText);
    return NextResponse.json(extracted);
  } catch (error) {
    console.error("Extract deal error:", error);
    return NextResponse.json(
      { error: "Failed to process with Claude AI" },
      { status: 500 }
    );
  }
}
