import { isIP } from "node:net";

function isPrivateIpv4(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  const [a, b] = host.split(".").map((n) => Number(n));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const lower = host.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

export function assertSafeOutboundHttpUrl(rawUrl: string): string {
  if (!URL.canParse(rawUrl)) {
    throw new Error("Webhook URL must be a valid http(s) URL.");
  }

  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Webhook URL must use http or https.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Webhook URL cannot target local/private addresses.");
  }

  const ipKind = isIP(hostname);
  if (
    (ipKind === 4 && isPrivateIpv4(hostname)) ||
    (ipKind === 6 && isPrivateIpv6(hostname))
  ) {
    throw new Error("Webhook URL cannot target local/private addresses.");
  }

  return parsed.toString();
}
