import { Response } from "express";

// httpOnly cookies scoped to the whole domain (COOKIE_DOMAIN has a leading
// dot, e.g. ".localhost" / ".yourapp.com") so a session started on the base
// domain survives navigating to a tenant subdomain — a plain in-memory JS
// token can't, since that's a different origin with fresh JS state.
export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const isProduction = process.env.NODE_ENV === "production";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // matches JWT_ACCESS_EXPIRES_IN default
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches JWT_REFRESH_EXPIRES_IN default

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    domain: COOKIE_DOMAIN,
    maxAge: ACCESS_MAX_AGE_MS,
    path: "/",
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    domain: COOKIE_DOMAIN,
    maxAge: REFRESH_MAX_AGE_MS,
    // Scoped narrower — only sent back on the one endpoint that needs it.
    path: "/api/v1/auth/refresh",
  });
}

export function setAccessCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    domain: COOKIE_DOMAIN,
    maxAge: ACCESS_MAX_AGE_MS,
    path: "/",
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/api/v1/auth/refresh" });
}
