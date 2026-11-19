// Subdomain detection for tenant routing. See backend/src/middleware/subdomainTenant.ts
// for the server-side half — this file's getCurrentSubdomain() output is what
// gets sent as the X-Tenant-Slug header on every API request.
const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || "localhost";

// Set VITE_USE_SUBDOMAINS=false to run every business on one address (e.g. a
// free *.vercel.app URL, which can't have its own subdomains). The backend
// still knows the business from the logged-in user's token, so nothing else
// changes — only the per-business address is skipped.
// A *.vercel.app address can never have per-business subdomains, so it is
// always single-address there.
export const SUBDOMAINS_ENABLED =
  import.meta.env.VITE_USE_SUBDOMAINS !== "false" &&
  !window.location.hostname.endsWith(".vercel.app");

export function getCurrentSubdomain(): string | null {
  if (!SUBDOMAINS_ENABLED) return null;
  const hostname = window.location.hostname;
  if (hostname === APP_DOMAIN || hostname === `www.${APP_DOMAIN}`) return null;
  if (hostname.endsWith(`.${APP_DOMAIN}`)) {
    const sub = hostname.slice(0, -(APP_DOMAIN.length + 1));
    return sub || null;
  }
  return null;
}

function originFor(host: string): string {
  const { protocol, port } = window.location;
  return `${protocol}//${host}${port ? `:${port}` : ""}`;
}

export function buildTenantOrigin(slug: string): string {
  if (!SUBDOMAINS_ENABLED) return window.location.origin;
  return originFor(`${slug}.${APP_DOMAIN}`);
}

export function buildBaseOrigin(): string {
  if (!SUBDOMAINS_ENABLED) return window.location.origin;
  return originFor(APP_DOMAIN);
}

export function goToTenant(slug: string, path = "/dashboard") {
  window.location.href = `${buildTenantOrigin(slug)}${path}`;
}

export function goToBase(path = "/") {
  window.location.href = `${buildBaseOrigin()}${path}`;
}
