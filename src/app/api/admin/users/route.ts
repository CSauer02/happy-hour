import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, supabase: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { error: "Forbidden", status: 403, supabase: null };
  return { error: null, status: 200, supabase };
}

export async function GET() {
  const { error, status, supabase } = await verifyAdmin();
  if (error || !supabase) {
    return NextResponse.json({ error }, { status });
  }
  const { data: users, error: dbError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .order("created_at", { ascending: true });
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const { error, status, supabase } = await verifyAdmin();
  if (error || !supabase) {
    return NextResponse.json({ error }, { status });
  }
  const { userId, role } = await req.json();
  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  }
  const { error: dbError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
