import type { NextFunction, Request, Response } from "express";

// Must be preceded by `authenticate` in the middleware chain (assumes req.user is set).
export function authorize(role: "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}
