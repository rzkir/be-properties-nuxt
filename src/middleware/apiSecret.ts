import type { RequestHandler } from "express";

export function requireApiSecret(apiSecret?: string): RequestHandler {
  return (req, res, next) => {
    if (!apiSecret) return res.status(500).json({ message: "API_SECRET not set" });
    const got = req.header("x-api-secret");
    if (!got || got !== apiSecret) {
      return res.status(401).json({ message: "Invalid api secret" });
    }
    return next();
  };
}