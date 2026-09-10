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
  console.error(err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
}