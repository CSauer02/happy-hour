import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.DEAL_UPDATER_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "Deal Updater password not configured on server" },
      { status: 503 }
    );
  }

  if (password === expected) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("deal-updater-auth", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
