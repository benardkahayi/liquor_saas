import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema, refreshSchema } from "./auth.validation";
import { registerTenant, login, refreshAccessToken } from "./auth.service";

// Controllers are intentionally thin: parse/validate input, call the
// service function that holds the real logic, shape the response.
// This split matters because it means auth.service.ts (the actual logic)
// could be reused by a CLI script or a test without any Express involved.

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const tokens = await registerTenant(input);
    res.status(201).json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const tokens = await login(input);
    res.status(200).json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await refreshAccessToken(refreshToken);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}