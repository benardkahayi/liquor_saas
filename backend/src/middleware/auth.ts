import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/common/utils/jwt";
import { UnauthorizedError } from "@/common/errors/AppError";
import { ACCESS_COOKIE } from "@/common/utils/authCookies";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const token = req.cookies?.[ACCESS_COOKIE] || bearerToken;

  if (!token) {
    return next(new UnauthorizedError("Missing or malformed Authorization"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}
