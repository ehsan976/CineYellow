import { revalidateTag } from "next/cache";

import { authorizeCron, runCronJob } from "@/lib/server/cron";
import { refreshStaleLanguages } from "@/lib/server/title-languages";

export const maxDuration = 60;

/** GET /api/cron/language-refresh — re-fetches automatic language rows older than 30 days. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return runCronJob("language-refresh", () => refreshStaleLanguages((tag) => revalidateTag(tag, "max")));
}
