import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema, refreshSchema } from "./auth.validation";
import { registerTenant, login, refreshAccessToken } from "./auth.service";
import { setAuthCookies, setAccessCookie, clearAuthCookies, REFRESH_COOKIE } from "@/common/utils/authCookies";

// Controllers are intentionally thin: parse/validate input, call the
// service function that holds the real logic, shape the response.
// This split matters because it means auth.service.ts (the actual logic)
// could be reused by a CLI script or a test without any Express involved.
//
// Tokens are returned in the JSON body (unchanged, for any non-browser
// client) AND set as httpOnly cookies (new — see common/utils/authCookies.ts
// for why: a subdomain redirect after login needs auth to survive an
// origin change, which in-memory-only tokens can't do).

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerTenant(input);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await login(input);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: bodyToken } = refreshSchema.parse(req.body);
    const refreshToken = bodyToken || req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "No refresh token provided" } });
      return;
    }

    const result = await refreshAccessToken(refreshToken);
    setAccessCookie(res, result.accessToken);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export function logoutHandler(_req: Request, res: Response) {
  clearAuthCookies(res);
  res.status(204).send();
}
