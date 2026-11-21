import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "@/common/errors/AppError";

// This runs whenever any route calls next(err). It's the ONE place that
// decides how errors become HTTP responses — every module's controllers
// stay clean because they never have to think about status codes for
// error cases, just throw and move on.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Errors we threw on purpose (NotFoundError, ConflictError, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Validation errors from zod .parse() calls
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }

  // Anything else is unexpected — log it fully server-side, but never leak
  // internal details (stack traces, DB error text) to the client.
  // Bad JSON, a body that's too big, a blocked origin: the request's fault,
  // not ours — say so instead of answering "something went wrong".
  const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const type = (err as { type?: string }).type;
    const message =
      type === "entity.too.large"
        ? "That's too big to upload. Please use a smaller file."
        : type === "entity.parse.failed"
          ? "The request couldn't be read."
          : "Bad request";
    return res.status(status).json({ error: { code: "BAD_REQUEST", message } });
  }
  if (err instanceof Error && err.message.includes("not allowed by CORS")) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "This website isn't allowed to use the API." } });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
}