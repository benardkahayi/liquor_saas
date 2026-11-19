import { Request, Response, NextFunction } from "express";
import { db } from "@/config/db";
import { ForbiddenError, NotFoundError } from "@/common/errors/AppError";

const APP_DOMAIN = process.env.APP_DOMAIN || "localhost";

// Pulls a tenant slug out of the request, two ways:
//
// 1. The request's OWN Host header, if it's literally "{slug}.APP_DOMAIN".
//    This is what "extract the subdomain" means in production once the API
//    sits behind the same subdomain routing as the frontend (or a proxy
//    that preserves the original Host).
// 2. The X-Tenant-Slug header, which the frontend sets to whatever
//    subdomain the BROWSER is currently on. This is needed today because
//    this backend is a single origin (localhost:4000) with no subdomains
//    of its own — the browser's subdomain never reaches it via Host at all.
//    Nothing here trusts this header for identity: it only names which
//    tenant the request CLAIMS to be for, and every route still resolves
//    the real tenant from the JWT. The cross-check happens in
//    middleware/tenant.ts, which 403s if the two disagree.
function extractSlug(req: Request): string | null {
  const hostname = req.hostname; // Express strips the port already
  if (hostname && hostname !== APP_DOMAIN && hostname.endsWith(`.${APP_DOMAIN}`)) {
    const sub = hostname.slice(0, -(APP_DOMAIN.length + 1));
    if (sub && sub !== "www") return sub;
  }

  const header = req.headers["x-tenant-slug"];
  if (typeof header === "string" && header.trim()) return header.trim();

  return null;
}

// Runs BEFORE requireAuth (registered globally in app.ts) so it can serve
// "business not found" / "suspended" for a tenant subdomain even when the
// visitor isn't logged in yet (e.g. hitting a dead tenant subdomain link).
export async function resolveSubdomainTenant(req: Request, _res: Response, next: NextFunction) {
  const slug = extractSlug(req);
  if (!slug) return next();

  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });

  if (!tenant) {
    return next(new NotFoundError("Business not found"));
  }

  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    return next(new ForbiddenError("This business account has been suspended. Contact support."));
  }

  req.subdomainSlug = slug;
  req.subdomainTenantId = tenant.id;
  next();
}
