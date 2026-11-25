import { revalidateTag } from "next/cache";

import { authorizeCron, runCronJob } from "@/lib/server/cron";
import { runSourceHealth } from "@/lib/server/source-health";

// Up to 25 sources × a 5 s timeout, 4 at a time.
export const maxDuration = 60;

/** GET /api/cron/source-health — checks the video sources most in need of it (lib/server/source-health.ts). */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return runCronJob("source-health", () => runSourceHealth((tag) => revalidateTag(tag, "max")));
}
