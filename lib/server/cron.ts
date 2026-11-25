// Background jobs run as route handlers under /api/cron/*, called on a schedule by Vercel Cron
// (vercel.json) or any scheduler that can send a header. Each request must carry
//   Authorization: Bearer <CRON_SECRET>
// Without CRON_SECRET set, the jobs are switched off (503), so they can't be triggered by anyone.
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** null when the caller may run the job, otherwise the response to send. */
export function authorizeCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Background jobs are off (CRON_SECRET isn't set)" }, { status: 503 });
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Runs a job, logging and returning its summary as JSON (never cached). */
export async function runCronJob(name: string, job: () => Promise<unknown>): Promise<NextResponse> {
  const started = Date.now();
  try {
    const result = await job();
    console.info(`[cron] ${name} done in ${Date.now() - started} ms`, result);
    return NextResponse.json({ job: name, ok: true, ms: Date.now() - started, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`[cron] ${name} failed`, error);
    return NextResponse.json({ job: name, ok: false, error: "Job failed; see the server log" }, { status: 500 });
  }
}
