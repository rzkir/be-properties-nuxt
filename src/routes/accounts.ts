import { Router } from "express";

import admin from "firebase-admin";

import { z } from "zod";

import type { RequestHandler } from "express";

import { requireAuth, getUser } from "../middleware/auth.js";

export function createAccountsRouter(opts: { sessionCookieName: string; apiSecret?: string }) {
  const router = Router();

  const UpdateMeSchema = z.object({
    displayName: z.string().trim().min(1).max(120).optional(),
    phoneNumber: z.string().trim().max(40).optional(),
    photoURL: z.string().url().optional(),
  });

  function accountsDoc(uid: string) {
    return admin.firestore().collection(process.env.FIREBASE_COLLECTION_ACCOUNTS as string).doc(uid);
  }

  // Middleware that requires API secret only
  function requireApiSecretOnly(): RequestHandler {
    return (req, res, next) => {
      if (!opts.apiSecret) {
        return res.status(500).json({ message: "API_SECRET not configured" });
      }

      const apiSecretHeader = req.header("x-api-secret");
      if (!apiSecretHeader || apiSecretHeader !== opts.apiSecret) {
        return res.status(401).json({ message: "Invalid or missing API secret" });
      }

      return next();
    };
  }

  router.get("/me", requireAuth({ sessionCookieName: opts.sessionCookieName }), async (req, res) => {
    const user = getUser(req);
    const snap = await accountsDoc(user.uid).get();
    if (!snap.exists) return res.json({ data: null });
    return res.json({ data: snap.data() });
  });

  router.patch("/me", requireAuth({ sessionCookieName: opts.sessionCookieName }), async (req, res) => {
    const user = getUser(req);
    const parsed = UpdateMeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

    const patch = parsed.data;
    const now = admin.firestore.Timestamp.now();

    await accountsDoc(user.uid).set(
      {
        ...patch,
        uid: user.uid,
        updatedAt: now,
      },
      { merge: true },
    );

    if (patch.displayName || patch.photoURL) {
      await admin.auth().updateUser(user.uid, {
        displayName: patch.displayName,
        photoURL: patch.photoURL,
      });
    }

    const updated = await accountsDoc(user.uid).get();
    return res.json({ data: updated.data() });
  });

  // Get all accounts (API secret required)
  router.get("/accounts", requireApiSecretOnly(), async (req, res) => {
    try {
      // Fetch all accounts from Firestore
      const accountsSnapshot = await admin
        .firestore()
        .collection(process.env.FIREBASE_COLLECTION_ACCOUNTS as string)
        .get();

      const accounts = accountsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email || null,
          displayName: data.displayName || null,
          phoneNumber: data.phoneNumber || null,
          photoURL: data.photoURL || null,
          role: data.role || "user",
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
        };
      });

      return res.json({ data: accounts });
    } catch (error: any) {
      console.error("[accounts] GET /accounts error:", error);
      return res.status(500).json({ message: error?.message ?? "Failed to fetch accounts" });
    }
  });

  return router;
}