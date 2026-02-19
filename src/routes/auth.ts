import { Router } from "express";

import admin from "firebase-admin";

import { z } from "zod";

import { firebaseAuthPost } from "@/firebaseAuthRest.js";

import { requireSessionAuth, getUser } from "@/middleware/sessionAuth.js";

export function createAuthRouter(opts: {
  firebaseApiKey: string;
  cookieName: string;
  sessionExpiresDays: number;
  cookieSecure: boolean;
}): Router {
  const router = Router();

  const cookieOptions = {
    httpOnly: true,
    secure: opts.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };

  async function setSessionCookie(res: any, idToken: string) {
    const expiresInMs = opts.sessionExpiresDays * 24 * 60 * 60 * 1000;
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn: expiresInMs });
    res.cookie(opts.cookieName, sessionCookie, {
      ...cookieOptions,
      maxAge: expiresInMs,
    });
  }

  const ChangePasswordBody = z.object({
    currentPassword: z.string().trim().min(6),
    newPassword: z.string().trim().min(6),
  });

  router.post("/auth/login", async (req, res) => {
    const Body = z.object({
      email: z.string().trim().email().transform((v) => v.toLowerCase()),
      password: z.string().trim().min(6),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

    try {
      const out = await firebaseAuthPost<SignInWithPasswordResponse>(
        opts.firebaseApiKey,
        "accounts:signInWithPassword",
        { ...parsed.data, returnSecureToken: true },
      );
      await setSessionCookie(res, out.idToken);
      return res.json({ ok: true });
    } catch (e: any) {
      const code = e?.message;
      const message =
        code === "INVALID_LOGIN_CREDENTIALS"
          ? "Email atau kata sandi salah."
          : code === "USER_DISABLED"
            ? "Akun Anda dinonaktifkan."
            : code === "TOO_MANY_ATTEMPTS_TRY_LATER"
              ? "Terlalu banyak percobaan. Coba lagi beberapa saat."
              : "Login gagal.";
      return res.status(401).json({ message, code });
    }
  });

  router.post("/auth/signup", async (req, res) => {
    const Body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      displayName: z.string().trim().min(1).max(120).optional(),
      phoneNumber: z.string().trim().max(40).optional(),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

    try {
      const out = await firebaseAuthPost<SignInWithPasswordResponse>(
        opts.firebaseApiKey,
        "accounts:signUp",
        {
          email: parsed.data.email,
          password: parsed.data.password,
          returnSecureToken: true,
        },
      );

      await setSessionCookie(res, out.idToken);

      const uid = out.localId;
      if (parsed.data.displayName) {
        await admin.auth().updateUser(uid, { displayName: parsed.data.displayName });
      }

      await admin.firestore().collection(process.env.FIREBASE_COLLECTION_ACCOUNTS as string).doc(uid).set(
        {
          uid,
          email: parsed.data.email,
          displayName: parsed.data.displayName ?? null,
          phoneNumber: parsed.data.phoneNumber ?? null,
          role: "user",
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true },
      );

      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(400).json({ message: e?.message ?? "Signup failed" });
    }
  });

  router.post("/auth/reset-password", async (req, res) => {
    const Body = z.object({ email: z.string().email() });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

    try {
      await firebaseAuthPost(
        opts.firebaseApiKey,
        "accounts:sendOobCode",
        { requestType: "PASSWORD_RESET", email: parsed.data.email },
      );
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(400).json({ message: e?.message ?? "Reset failed" });
    }
  });

  router.post("/auth/logout", requireSessionAuth(opts.cookieName), async (req, res) => {
    try {
      const u = getUser(req);
      await admin.auth().revokeRefreshTokens(u.uid);
    } catch {
    }
    res.clearCookie(opts.cookieName, cookieOptions);
    return res.json({ ok: true });
  });

  router.post(
    "/auth/change-password",
    requireSessionAuth(opts.cookieName),
    async (req, res) => {
      const parsed = ChangePasswordBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

      const u = getUser(req);

      try {
        const authUser = await admin.auth().getUser(u.uid);
        const email = authUser.email;
        if (!email) {
          return res
            .status(400)
            .json({ message: "Akun ini tidak memiliki email yang valid" });
        }

        // Re-authenticate with current password to verify it
        let signInOut: SignInWithPasswordResponse;
        try {
          signInOut = await firebaseAuthPost<SignInWithPasswordResponse>(
            opts.firebaseApiKey,
            "accounts:signInWithPassword",
            {
              email,
              password: parsed.data.currentPassword,
              returnSecureToken: true,
            },
          );
        } catch (e: any) {
          const code = e?.message;
          const message =
            code === "INVALID_LOGIN_CREDENTIALS"
              ? "Kata sandi lama salah."
              : "Gagal memverifikasi kata sandi lama.";
          return res.status(400).json({ message, code });
        }

        // Update password using Firebase Admin SDK
        await admin.auth().updateUser(u.uid, {
          password: parsed.data.newPassword,
        });

        // Optionally, refresh session cookie with new idToken (not strictly required)
        if (signInOut.idToken) {
          await setSessionCookie(res, signInOut.idToken);
        }

        return res.json({ ok: true });
      } catch (e: any) {
        console.error("[auth/change-password] error:", e);
        return res
          .status(500)
          .json({ message: e?.message ?? "Gagal memperbarui kata sandi" });
      }
    },
  );

  router.delete(
    "/auth/delete-account",
    requireSessionAuth(opts.cookieName),
    async (req, res) => {
      try {
        const u = getUser(req);

        // Hapus dokumen akun di Firestore (jika ada)
        try {
          await admin.firestore().collection(process.env.FIREBASE_COLLECTION_ACCOUNTS as string).doc(u.uid).delete();
        } catch (e) {
          console.error("[auth/delete-account] Firestore delete error:", e);
        }

        // Hapus user di Firebase Auth
        await admin.auth().deleteUser(u.uid);

        // Revoke semua refresh token (jaga-jaga)
        try {
          await admin.auth().revokeRefreshTokens(u.uid);
        } catch (e) {
          console.error("[auth/delete-account] revoke tokens error:", e);
        }

        // Bersihkan session cookie
        res.clearCookie(opts.cookieName, cookieOptions);

        return res.json({ ok: true });
      } catch (e: any) {
        console.error("[auth/delete-account] error:", e);
        return res
          .status(500)
          .json({ message: e?.message ?? "Gagal menghapus akun" });
      }
    },
  );

  router.get("/auth/me", requireSessionAuth(opts.cookieName), async (req, res) => {
    const u = getUser(req);
    const authUser = await admin.auth().getUser(u.uid);
    const accSnap = await admin.firestore().collection(process.env.FIREBASE_COLLECTION_ACCOUNTS as string).doc(u.uid).get();
    const acc = accSnap.exists ? accSnap.data() : null;
    return res.json({
      data: {
        uid: u.uid,
        email: authUser.email ?? null,
        displayName: authUser.displayName ?? null,
        phoneNumber: authUser.phoneNumber ?? null,
        photoURL: authUser.photoURL ?? null,
        role: (acc as any)?.role ?? "user",
      },
    });
  });

  return router;
}