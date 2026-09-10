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