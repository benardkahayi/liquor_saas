import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/common/utils/jwt";
import { UnauthorizedError } from "@/common/errors/AppError";
import { ACCESS_COOKIE } from "@/common/utils/authCookies";
import { db } from "@/config/db";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const token = req.cookies?.[ACCESS_COOKIE] || bearerToken;

  if (!token) {
    return next(new UnauthorizedError("Missing or malformed Authorization"));
  }

  let payload: ReturnType<typeof verifyAccessToken> & { iat?: number };
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new UnauthorizedError("Invalid or expired token"));
  }

  // The token alone stays valid for up to 15 minutes. Check the account too,
  // so blocking someone or resetting a password takes effect at once.
  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true, passwordChangedAt: true },
    });
    if (!user || !user.isActive) {
      return next(new UnauthorizedError("This account can't sign in."));
    }
    const issuedAtMs = (payload.iat ?? 0) * 1000;
    if (user.passwordChangedAt && issuedAtMs < user.passwordChangedAt.getTime() - 1000) {
      return next(new UnauthorizedError("Your password was changed. Please sign in again."));
    }
  } catch (err) {
    return next(err);
  }

  req.user = payload;
  next();
}
