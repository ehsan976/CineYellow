"use server";

// Server actions for managing built-in embed servers (/admin/videos) and user broken reports (/watch).
import { updateTag } from "next/cache";

import { ForbiddenError, UnauthorizedError, requireAdmin, requireUser } from "@/lib/server/dal";
import {
  EMBED_SERVERS_TAG,
  recordBrokenEmbedReport,
  runEmbedHealthCheck,
  updateEmbedServerState,
} from "@/lib/server/embed-health";
import { hitLimit } from "@/lib/server/rate-limit";

export type EmbedActionResult = { ok: boolean; error?: string; message?: string };

class InputError extends Error {}

const PROVIDER_ID = /^[a-z0-9-]{1,40}$/;

async function attempt(fn: () => Promise<string | void>): Promise<EmbedActionResult> {
  try {
    const message = await fn();
    return { ok: true, ...(message ? { message } : {}) };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "Please sign in first." };
    if (error instanceof ForbiddenError) return { ok: false, error: "Admins only." };
    if (error instanceof InputError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Action failed. Please try again." };
  }
}

function priorityValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 1000) throw new InputError("Priority must be a whole number from 0 to 1000.");
  return n;
}

/** Admin: toggle an embed server on/off, update its priority, or clear its user report/fail counters. */
export async function updateEmbedServerAction(
  id: string,
  patch: { enabled?: boolean; priority?: number | string; resetReports?: boolean }
) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof id !== "string" || !PROVIDER_ID.test(id)) throw new InputError("Invalid server id.");
    const clean: Parameters<typeof updateEmbedServerState>[1] = {};
    if (patch?.enabled !== undefined) clean.enabled = Boolean(patch.enabled);
    if (patch?.priority !== undefined) clean.priority = priorityValue(patch.priority);
    if (patch?.resetReports) clean.resetReports = true;
    if (!Object.keys(clean).length) throw new InputError("Nothing to change.");

    if (!(await updateEmbedServerState(id, clean))) throw new InputError("Unknown embed server.");
    updateTag(EMBED_SERVERS_TAG);
    if (clean.resetReports) return "Reports cleared and server restored";
    if (clean.enabled !== undefined) return clean.enabled ? "Server enabled" : "Server hidden";
    return "Server priority updated";
  });
}

/** Admin: check all 16 embed servers right now and save latency + uptime history. */
export async function checkAllEmbedServersAction() {
  return attempt(async () => {
    await requireAdmin();
    const s = await runEmbedHealthCheck(updateTag);
    return `Checked ${s.checked} servers: ${s.online} online, ${s.slow} slow, ${s.down} down`;
  });
}

/** Admin: check one specific embed server right now. */
export async function checkOneEmbedServerAction(id: string) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof id !== "string" || !PROVIDER_ID.test(id)) throw new InputError("Invalid server id.");
    const s = await runEmbedHealthCheck(updateTag, [id]);
    if (!s.checked) throw new InputError("Unknown embed server.");
    if (s.down) throw new InputError("Server is down or unreachable");
    return s.slow ? "Server responded slowly" : "Server is online";
  });
}

/** Signed-in viewer: report a broken embed server on the watch page (1 vote per user per server). */
export async function reportBrokenServerAction(input: { serverId: string; titleId: string }) {
  return attempt(async () => {
    const user = await requireUser();
    const { ok, retryAfter } = hitLimit(user.id, "serverReport");
    if (!ok) throw new InputError(`Too many reports. Try again in ${retryAfter}s.`);

    const serverId = typeof input?.serverId === "string" ? input.serverId : "";
    const titleId = typeof input?.titleId === "string" ? input.titleId : "";
    if (!PROVIDER_ID.test(serverId)) throw new InputError("Invalid server.");

    const count = await recordBrokenEmbedReport(serverId, user.id, titleId);
    updateTag(EMBED_SERVERS_TAG);
    return count >= 3
      ? "Reported — server demoted for review"
      : "Reported — thank you for the feedback";
  });
}
