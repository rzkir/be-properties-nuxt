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

export function requireAuth(opts?: { sessionCookieName?: string }): RequestHandler {
  return async (req, res, next) => {
    const header = req.header("authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1];

    try {
      if (token) {
        const decoded = await admin.auth().verifyIdToken(token);
        (req as unknown as { user: AuthedUser }).user = decoded;
        return next();
      }

      const name = opts?.sessionCookieName;
      if (name) {
        const cookie =
          (req as any).cookies?.[name] ??
          readCookie(req as any, name);
        if (cookie) {
          const decoded = await admin.auth().verifySessionCookie(cookie, true);
          (req as unknown as { user: AuthedUser }).user = decoded;
          return next();
        }
      }

      return res.status(401).json({ message: "Missing auth" });
    } catch {
      return res.status(401).json({ message: "Invalid auth" });
    }
  };
}

export function requireFirebaseAuth(): RequestHandler {
  return requireAuth();
}

export function getUser(req: unknown): AuthedUser {
  const u = (req as { user?: AuthedUser }).user;
  if (!u) throw new Error("Auth middleware missing");
  return u;
}

declare global {
  var __AUTH_USER__: unknown;
}