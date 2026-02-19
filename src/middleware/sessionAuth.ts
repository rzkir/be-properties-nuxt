import type { RequestHandler } from "express";

import admin from "firebase-admin";

export type AuthedUser = admin.auth.DecodedIdToken;

function readCookie(req: { headers?: Record<string, string | string[] | undefined> }, name: string) {
  const header = req.headers?.cookie;
  if (!header || typeof header !== "string") return undefined;
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

export function requireSessionAuth(cookieName: string): RequestHandler {
  return async (req, res, next) => {
    const cookieHeader = req.headers?.cookie;
    const cookie =
      (req as any).cookies?.[cookieName] ??
      readCookie(req as any, cookieName);

    // Debug logging
    console.log("[sessionAuth] Cookie header:", cookieHeader ? "present" : "missing");
    console.log("[sessionAuth] Parsed cookie:", cookie ? "found" : "not found");
    console.log("[sessionAuth] Cookie name:", cookieName);
    console.log("[sessionAuth] Origin:", req.headers.origin);
    console.log("[sessionAuth] Referer:", req.headers.referer);

    if (!cookie) {
      console.error("[sessionAuth] Missing session cookie. Cookie header:", cookieHeader);
      return res.status(401).json({ message: "Missing session cookie" });
    }

    try {
      const decoded = await admin.auth().verifySessionCookie(cookie, true);
      (req as any).user = decoded;
      return next();
    } catch (err) {
      console.error("[sessionAuth] verifySessionCookie error:", err);
      return res.status(401).json({ message: "Invalid session" });
    }
  };
}

export function getUser(req: unknown): AuthedUser {
  const u = (req as any).user as AuthedUser | undefined;
  if (!u) throw new Error("Auth middleware missing");
  return u;
}