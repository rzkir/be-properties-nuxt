import { Router } from "express";

import admin from "firebase-admin";

import { z } from "zod";

import { requireAuth, getUser } from "../middleware/auth.js";

export function createPropertiesBadgeRouter(opts: { sessionCookieName: string }) {
  const router = Router();

  const CreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    badgesId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional().default(true),
  });

  const UpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    badgesId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  });

  function propertiesBadgeCollection() {
    return admin.firestore().collection(process.env.FIREBASE_COLLECTION_PROPERTIES_BADGE as string);
  }

  function propertiesBadgeDoc(id: string) {
    return propertiesBadgeCollection().doc(id);
  }

  // GET /properties-badge - List all property badges
  router.get(
    "/",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const snapshot = await propertiesBadgeCollection()
          .orderBy("createdAt", "desc")
          .get();

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.json({ data });
      } catch (error: any) {
        console.error("[BE] GET /properties-badge error:", error);
        return res.status(500).json({ message: "Failed to fetch property badges" });
      }
    },
  );

  // GET /properties-badge/:id - Get single property badge
  router.get(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesBadgeDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property badge not found" });
        }

        return res.json({ data: { id: snap.id, ...snap.data() } });
      } catch (error: any) {
        console.error("[BE] GET /properties-badge/:id error:", error);
        return res.status(500).json({ message: "Failed to fetch property badge" });
      }
    },
  );

  // POST /properties-badge - Create new property badge
  router.post(
    "/",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const user = getUser(req);
        const parsed = CreateSchema.safeParse(req.body);

        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid body",
            errors: parsed.error.issues,
          });
        }

        const now = admin.firestore.Timestamp.now();
        const data = {
          ...parsed.data,
          createdAt: now,
          updatedAt: now,
          createdBy: user.uid,
        };

        const docRef = await propertiesBadgeCollection().add(data);
        const created = await docRef.get();

        return res.status(201).json({
          data: { id: created.id, ...created.data() }
        });
      } catch (error: any) {
        console.error("[BE] POST /properties-badge error:", error);
        return res.status(500).json({ message: "Failed to create property badge" });
      }
    },
  );

  // PATCH /properties-badge/:id - Update property badge
  router.patch(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const parsed = UpdateSchema.safeParse(req.body);

        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid body",
            errors: parsed.error.issues,
          });
        }

        const snap = await propertiesBadgeDoc(id as string).get();
        if (!snap.exists) {
          return res.status(404).json({ message: "Property badge not found" });
        }

        const now = admin.firestore.Timestamp.now();
        const updateData = {
          ...parsed.data,
          updatedAt: now,
        };

        await propertiesBadgeDoc(id as string).update(updateData);
        const updated = await propertiesBadgeDoc(id as string).get();

        return res.json({ data: { id: updated.id, ...updated.data() } });
      } catch (error: any) {
        console.error("[BE] PATCH /properties-badge/:id error:", error);
        return res.status(500).json({ message: "Failed to update property badge" });
      }
    },
  );

  // DELETE /properties-badge/:id - Delete property badge
  router.delete(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesBadgeDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property badge not found" });
        }

        await propertiesBadgeDoc(id as string).delete();

        return res.json({ message: "Property badge deleted successfully" });
      } catch (error: any) {
        console.error("[BE] DELETE /properties-badge/:id error:", error);
        return res.status(500).json({ message: "Failed to delete property badge" });
      }
    },
  );

  return router;
}
