import { Router } from "express";

import admin from "firebase-admin";

import { z } from "zod";

import { requireAuth, getUser } from "@/middleware/auth.js";

export function createAccountsRouter(opts: { sessionCookieName: string }) {
  const router = Router();

  const UpdateMeSchema = z.object({
    displayName: z.string().trim().min(1).max(120).optional(),
    phoneNumber: z.string().trim().max(40).optional(),
    photoURL: z.string().url().optional(),
  });

  function accountsDoc(uid: string) {
    return admin.firestore().collection(process.env.FIREBASE_COLLECTION_ACCOUNTS as string).doc(uid);
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

  return router;
}