// Trakt API calls (https://trakt.docs.apiary.io). Never throw: callers get { ok: false }.
// Token storage lives in lib/server/trakt.ts; this file only talks HTTP.
import "server-only";
import { TRAKT_API, trakt } from "@/lib/trakt/config";

export type TraktResult<T> = { ok: true; data: T; status: number } | { ok: false; status: number; error?: string };

export interface TraktTokens {
  access_token: string;
  refresh_token: string;
  /** Seconds. */
  expires_in: number;
  /** Unix seconds. */
  created_at: number;
}

function headers(accessToken?: string): Record<string, string> {
  return {
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": "CineYellow/1.0",
    "trakt-api-version": "2",
    "trakt-api-key": trakt.clientId,
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function call<T>(method: "GET" | "POST", path: string, accessToken?: string, body?: unknown): Promise<TraktResult<T>> {
  try {
    const res = await fetch(`${TRAKT_API}${path}`, {
      method,
      headers: headers(accessToken),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      let error: string | undefined;
      try {
        error = ((await res.json()) as { error?: string }).error;
      } catch {
        // no JSON body
      }
      if (res.status !== 401) console.warn(`[trakt] ${method} ${path} → HTTP ${res.status}${error ? ` (${error})` : ""}`);
      return { ok: false, status: res.status, error };
    }
    const text = await res.text();
    return { ok: true, status: res.status, data: (text ? JSON.parse(text) : null) as T };
  } catch (error) {
    console.warn(`[trakt] ${method} ${path} failed:`, error instanceof Error ? error.message : error);
    return { ok: false, status: 0 };
  }
}

export const traktGet = <T>(path: string, accessToken: string) => call<T>("GET", path, accessToken);
export const traktPost = <T>(path: string, accessToken: string, body: unknown) => call<T>("POST", path, accessToken, body);

/** Swaps the code from the OAuth redirect for tokens. */
export function exchangeCode(code: string) {
  return call<TraktTokens>("POST", "/oauth/token", undefined, {
    code,
    client_id: trakt.clientId,
    client_secret: trakt.clientSecret,
    redirect_uri: trakt.redirectUri,
    grant_type: "authorization_code",
  });
}

/** New tokens from a refresh token. `error === "invalid_grant"` means the link was revoked. */
export function refreshTokens(refreshToken: string) {
  return call<TraktTokens>("POST", "/oauth/token", undefined, {
    refresh_token: refreshToken,
    client_id: trakt.clientId,
    client_secret: trakt.clientSecret,
    redirect_uri: trakt.redirectUri,
    grant_type: "refresh_token",
  });
}

/** Best effort: tells Trakt the token is no longer used. */
export function revokeToken(accessToken: string) {
  return call<null>("POST", "/oauth/revoke", undefined, {
    token: accessToken,
    client_id: trakt.clientId,
    client_secret: trakt.clientSecret,
  });
}

export const expiresAtOf = (t: TraktTokens) => new Date((t.created_at + t.expires_in) * 1000);
