import { authorizeCron, runCronJob } from "@/lib/server/cron";
import { pruneOldHistory } from "@/lib/server/maintenance";

/** GET /api/cron/prune — deletes watch history untouched for a year. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return runCronJob("prune", pruneOldHistory);
}
