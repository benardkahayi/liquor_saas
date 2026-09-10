import { Request, Response, NextFunction } from "express";
import { db } from "@/config/db";
import { ForbiddenError, UnauthorizedError } from "@/common/errors/AppError";

export function requirePermission(permissionKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    if (!req.user.roleId) {
      return next(new ForbiddenError("No role assigned to this account"));
    }

    const hasPermission = await db.rolePermission.findFirst({
      where: {
        roleId: req.user.roleId,
        permission: { key: permissionKey },
      },
    });

    if (!hasPermission) {
      return next(
        new ForbiddenError(`Missing required permission: ${permissionKey}`)
      );
    }

    next();
  };
}