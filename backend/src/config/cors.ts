import type { CorsOptions } from "cors";

const APP_DOMAIN = process.env.APP_DOMAIN || "localhost";
const FRONTEND_PORTS = (process.env.FRONTEND_PORTS || "5173,5174")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

// A single CORS_ORIGIN string can't express "any tenant subdomain of
// APP_DOMAIN" (abc-wines.localhost, mama-shop.localhost, ...), so this
// validates against a pattern instead: the bare domain or any subdomain of
// it, each on one of the known frontend dev ports. In production
// (FRONTEND_PORTS unset / APP_DOMAIN a real domain), the port check is
// skipped since there's no :5173 in a real URL.
// Vercel also gives every deploy its own preview address, e.g.
// liquor-saas-ok4kz18a8-benards-projects-7aff9b42.vercel.app. Those are
// allowed too — but only ones that start with this project's name AND end
// with this Vercel team's suffix, so nobody else's Vercel site matches.
// Override with PREVIEW_HOST_SUFFIX if the Vercel team ever changes;
// set it to "off" to turn previews off.
const PREVIEW_HOST_SUFFIX = process.env.PREVIEW_HOST_SUFFIX ?? "-benards-projects-7aff9b42.vercel.app";
const PROJECT_PREFIX = `${APP_DOMAIN.split(".")[0]}-`;

function isOwnVercelPreview(hostname: string): boolean {
  if (!PREVIEW_HOST_SUFFIX || PREVIEW_HOST_SUFFIX === "off") return false;
  if (!hostname.startsWith(PROJECT_PREFIX) || !hostname.endsWith(PREVIEW_HOST_SUFFIX)) return false;
  const middle = hostname.slice(PROJECT_PREFIX.length, hostname.length - PREVIEW_HOST_SUFFIX.length);
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(middle); // one Vercel label, no extra dots
}

export function buildCorsOriginValidator(): CorsOptions["origin"] {
  const isProduction = process.env.NODE_ENV === "production";

  return (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin / server-to-server / curl

    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      return callback(new Error("Invalid origin"));
    }

    const hostMatches =
      url.hostname === APP_DOMAIN ||
      url.hostname.endsWith(`.${APP_DOMAIN}`) ||
      (url.protocol === "https:" && isOwnVercelPreview(url.hostname));
    const portMatches = isProduction || !url.port || FRONTEND_PORTS.includes(url.port);
    // In development, also allow localhost (platform app runs on localhost while tenant apps use APP_DOMAIN)
    const localhostAllowed =
      process.env.NODE_ENV !== "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    if ((hostMatches || localhostAllowed) && portMatches) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  };
}
