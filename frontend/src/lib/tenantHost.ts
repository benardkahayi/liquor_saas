// Subdomain detection for tenant routing. See backend/src/middleware/subdomainTenant.ts
// for the server-side half — this file's getCurrentSubdomain() output is what
// gets sent as the X-Tenant-Slug header on every API request.
const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || "localhost";

export function getCurrentSubdomain(): string | null {
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
  return originFor(`${slug}.${APP_DOMAIN}`);
}

export function buildBaseOrigin(): string {
  return originFor(APP_DOMAIN);
}

export function goToTenant(slug: string, path = "/dashboard") {
  window.location.href = `${buildTenantOrigin(slug)}${path}`;
}

export function goToBase(path = "/") {
  window.location.href = `${buildBaseOrigin()}${path}`;
}
