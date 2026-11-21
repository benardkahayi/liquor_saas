import type { Request } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";

// Limits how fast anyone can hit the sign-in style endpoints, so passwords
// can't be guessed by trying thousands of times.
//
// Requests reach us through Vercel and Render, which put the visitor's IP
// first in X-Forwarded-For. Someone calling Render directly could fake that
// header, so the IP limits are only a first line; the per-email login limit
// below works no matter what IP is claimed.

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

const byIp = (req: Request) => ipKeyGenerator(clientIp(req));

function limiter(opts: { windowMinutes: number; max: number; message: string } & Partial<Options>) {
  const { windowMinutes, max, message, ...rest } = opts;
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: byIp,
    // We read X-Forwarded-For ourselves (see above).
    validate: { xForwardedForHeader: false, trustProxy: false },
    handler: (_req, res) => {
      res.status(429).json({ error: { code: "TOO_MANY_REQUESTS", message } });
    },
    ...rest,
  });
}

const WAIT = "Too many attempts. Please wait a few minutes and try again.";

// Wrong passwords from one device.
export const loginIpLimit = limiter({ windowMinutes: 15, max: 30, message: WAIT, skipSuccessfulRequests: true });

// Wrong passwords for one account, from anywhere.
export const loginEmailLimit = limiter({
  windowMinutes: 15,
  max: 10,
  message: "Too many wrong passwords for this account. Wait 15 minutes, or reset your password.",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return email ? `email:${email}` : `ip:${byIp(req)}`;
  },
});

export const registerLimit = limiter({ windowMinutes: 60, max: 10, message: WAIT });
export const forgotPasswordLimit = limiter({ windowMinutes: 15, max: 10, message: WAIT });
export const resetPasswordLimit = limiter({ windowMinutes: 15, max: 20, message: WAIT });
export const refreshLimit = limiter({ windowMinutes: 15, max: 120, message: WAIT });

// Everything else: generous, only stops floods.
export const apiLimit = limiter({ windowMinutes: 1, max: 600, message: "Too many requests. Slow down a little." });
