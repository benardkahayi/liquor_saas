import { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "@/common/errors/AppError";

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  if (!req.user.isSuperAdmin) {
    return next(new ForbiddenError("Super admin access required"));
  }

  next();
}