import { NextResponse, type NextRequest } from "next/server";

import { UnauthorizedError, requireProfile } from "@/lib/server/dal";
import { getTraktStatus } from "@/lib/server/trakt";

/** GET /api/trakt/status?profileId=… → { enabled, connected, username } (never tokens). */
export async function GET(request: NextRequest) {
  try {
    const { profileId } = await requireProfile(request.nextUrl.searchParams.get("profileId"));
    return NextResponse.json(await getTraktStatus(profileId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }
}
