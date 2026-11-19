import { Request, Response, NextFunction } from "express";
import { db } from "@/config/db";
import { ForbiddenError, UnauthorizedError } from "@/common/errors/AppError";

export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  if (!req.user.tenantId) {
    return next(new ForbiddenError("No tenant associated with this account"));
  }

  // Security check: if this request named a tenant subdomain (see
  // middleware/subdomainTenant.ts), it must be the SAME tenant the
  // authenticated user's JWT actually belongs to. A user logged into
  // abc-wines can't use their session to read mama-shop's data just by
  // being on (or claiming to be on) mama-shop's subdomain.
  if (req.subdomainTenantId && req.subdomainTenantId !== req.user.tenantId) {
    return next(new ForbiddenError("You don't have access to this business."));
  }

  const tenant = await db.tenant.findUnique({
    where: { id: req.user.tenantId },
    select: { status: true },
  });

  if (!tenant) {
    return next(new ForbiddenError("Tenant no longer exists"));
  }

  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    return next(new ForbiddenError("This account is suspended. Contact support."));
  }

  next();
}
