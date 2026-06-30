import type { NextFunction, Request, Response, RequestHandler } from "express";

// Wraps an async route handler so thrown errors reach the error middleware.
// Must be the outermost wrapper around async controller methods.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => fn(req, res, next).catch(next);
}
