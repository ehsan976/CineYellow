import { revalidateTag } from "next/cache";

import { authorizeCron, runCronJob } from "@/lib/server/cron";
import { runEmbedHealthCheck } from "@/lib/server/embed-health";

// 16 embed providers × 7 s timeout, 4 at a time.
export const maxDuration = 60;

/** GET /api/cron/embed-health — probes all embed servers and updates status, latency & uptime history. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return runCronJob("embed-health", () => runEmbedHealthCheck((tag) => revalidateTag(tag, "max")));
}
