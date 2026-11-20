import { NextResponse } from "next/server";

import { UnauthorizedError, getCurrentUser, getUserData } from "@/lib/server/dal";

/** The signed-in user's profiles, lists, history, player prefs and settings. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getUserData(user);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    // Session revoked or user banned (the cookie cache can lag the database by a few minutes).
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }
}
