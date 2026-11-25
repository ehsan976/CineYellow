// Fetching URLs that came from admins (video sources) without opening an SSRF hole: the server
// must never be talked into requesting its own network (localhost, 10.x, cloud metadata…).
// - https only, on the standard port.
// - The host must be allowed for the provider (empty list = any public host).
// - Every address the name resolves to must be public; redirects are not followed.
// - Short timeout and a size cap.
// (DNS can change between our lookup and the request — "rebinding". Refusing redirects and
// private answers covers the common cases; a fully closed hole needs an egress proxy.)
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class BlockedUrlError extends Error {}

const hostAllowed = (host: string, allowed: string[]) =>
  !allowed.length || allowed.some((d) => host === d || host.endsWith(`.${d}`));

/** Loopback, private, link-local, CGNAT, multicast, reserved and the like. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb") || v6.startsWith("ff");
}

export interface SafeFetchResult {
  status: number;
  /** Body as text, cut at maxBytes. */
  text: string;
  ms: number;
}

export async function safeFetch(
  rawUrl: string,
  { allowedHosts = [], timeoutMs = 5000, maxBytes = 1_000_000, accept = "*/*" }: { allowedHosts?: string[]; timeoutMs?: number; maxBytes?: number; accept?: string } = {}
): Promise<SafeFetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError("not a valid URL");
  }
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password) {
    throw new BlockedUrlError("only plain https URLs are fetched");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostAllowed(host, allowedHosts)) throw new BlockedUrlError(`host ${host} isn't allowed for this provider`);
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw new BlockedUrlError(`host ${host} doesn't resolve`);
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new BlockedUrlError(`host ${host} points to a private address`);

  const started = Date.now();
  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept, "user-agent": "CineYellow-HealthCheck/1.0" },
    cache: "no-store",
  });
  // Read at most maxBytes, then stop.
  let text = "";
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      text += decoder.decode(value, { stream: true });
    }
    await reader.cancel().catch(() => {});
  }
  return { status: res.status, text: text.slice(0, maxBytes), ms: Date.now() - started };
}
