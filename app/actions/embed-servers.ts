"use server";

// Server actions for managing built-in & custom embed servers (/admin/videos) and broken reports (/watch).
import type { ServerLanguage } from "@/lib/types";
import { updateTag } from "next/cache";

import { validateEmbedTemplate } from "@/lib/player/embed-providers";
import { ForbiddenError, UnauthorizedError, requireAdmin, requireUser } from "@/lib/server/dal";
import {
  EMBED_SERVERS_TAG,
  deleteCustomEmbedServer,
  recordBrokenEmbedReport,
  runEmbedHealthCheck,
  saveEmbedServer,
  updateEmbedServerState,
} from "@/lib/server/embed-health";
import { hitLimit } from "@/lib/server/rate-limit";

export type EmbedActionResult = { ok: boolean; error?: string; message?: string };

class InputError extends Error {}

const PROVIDER_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

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

function slugifyId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
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

/**
 * Admin: add a new custom embed server, edit an existing custom or built-in server's
 * metadata/URL templates, or restore a built-in server back to code defaults.
 */
export async function saveEmbedServerAction(input: {
  id?: string;
  isNew: boolean;
  name: string;
  badge?: string;
  language: ServerLanguage;
  movieUrlTemplate: string;
  tvUrlTemplate?: string;
  mirrors?: string;
  priority?: number | string;
  resetOverrides?: boolean;
}) {
  return attempt(async () => {
    await requireAdmin();
    const isNew = Boolean(input?.isNew);
    const name = String(input?.name ?? "").trim().slice(0, 60);
    if (!input?.resetOverrides && !name) throw new InputError("Server name is required.");

    const rawId = String(input?.id ?? "").trim();
    const id = isNew ? slugifyId(rawId || name) : rawId;
    if (!PROVIDER_ID.test(id)) {
      throw new InputError("Server ID must use lowercase letters, numbers, and hyphens (e.g. my-server).");
    }

    if (input?.resetOverrides) {
      const res = await saveEmbedServer({
        id,
        isNew: false,
        name,
        badge: "",
        language: "english",
        movieUrlTemplate: "",
        tvUrlTemplate: "",
        mirrors: [],
        priority: 100,
        resetOverrides: true,
      });
      if (!res.ok) throw new InputError(res.error);
      updateTag(EMBED_SERVERS_TAG);
      return "Restored built-in server defaults";
    }

    const language: ServerLanguage = input?.language === "hindi" ? "hindi" : "english";
    const movieCheck = validateEmbedTemplate(String(input?.movieUrlTemplate ?? ""), { required: true });
    if (!movieCheck.ok) throw new InputError(`Movie URL: ${movieCheck.error}`);

    const tvCheck = validateEmbedTemplate(String(input?.tvUrlTemplate ?? ""), { required: false });
    if (!tvCheck.ok) throw new InputError(`TV URL: ${tvCheck.error}`);

    const mirrors = String(input?.mirrors ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s !== id && PROVIDER_ID.test(s))
      .slice(0, 5);

    const priority = priorityValue(input?.priority === undefined || input?.priority === "" ? 100 : input.priority);
    const badge = String(input?.badge ?? "").trim().slice(0, 30);

    const res = await saveEmbedServer({
      id,
      isNew,
      name,
      badge,
      language,
      movieUrlTemplate: movieCheck.value,
      tvUrlTemplate: tvCheck.value,
      mirrors,
      priority,
    });
    if (!res.ok) throw new InputError(res.error);

    updateTag(EMBED_SERVERS_TAG);
    return res.created ? `Added ${name}` : `Updated ${name}`;
  });
}

/** Admin: delete a custom embed server (built-in servers can be hidden instead). */
export async function deleteEmbedServerAction(id: string) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof id !== "string" || !PROVIDER_ID.test(id)) throw new InputError("Invalid server id.");
    const outcome = await deleteCustomEmbedServer(id);
    if (outcome === "builtin") throw new InputError("Built-in servers can't be deleted; turn it off instead.");
    if (outcome === "not_found") throw new InputError("Server was already removed.");
    updateTag(EMBED_SERVERS_TAG);
    return "Custom server removed";
  });
}

/** Admin: check all embed servers right now and save latency + uptime history. */
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
