import { Router } from "express";

import admin from "firebase-admin";

import { z } from "zod";

import { requireAuth, getUser } from "../middleware/auth.js";

export function createPropertiesLocationRouter(opts: { sessionCookieName: string }) {
  const router = Router();

  const CreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    locationsId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional().default(true),
  });

  const UpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    locationsId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  });

  function propertiesLocationCollection() {
    return admin.firestore().collection(process.env.FIREBASE_COLLECTION_PROPERTIES_LOCATION as string);
  }

  function propertiesLocationDoc(id: string) {
    return propertiesLocationCollection().doc(id);
  }

  // GET /properties-location - List all property locations
  router.get(
    "/",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const snapshot = await propertiesLocationCollection()
          .orderBy("createdAt", "desc")
          .get();

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.json({ data });
      } catch (error: any) {
        console.error("[BE] GET /properties-location error:", error);
        return res.status(500).json({ message: "Failed to fetch property locations" });
      }
    },
  );

  // GET /properties-location/:id - Get single property location
  router.get(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesLocationDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property location not found" });
        }

        return res.json({ data: { id: snap.id, ...snap.data() } });
      } catch (error: any) {
        console.error("[BE] GET /properties-location/:id error:", error);
        return res.status(500).json({ message: "Failed to fetch property location" });
      }
    },
  );

  // POST /properties-location - Create new property location
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

        const docRef = await propertiesLocationCollection().add(data);
        const created = await docRef.get();

        return res.status(201).json({
          data: { id: created.id, ...created.data() }
        });
      } catch (error: any) {
        console.error("[BE] POST /properties-location error:", error);
        return res.status(500).json({ message: "Failed to create property location" });
      }
    },
  );

  // PATCH /properties-location/:id - Update property location
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

        const snap = await propertiesLocationDoc(id as string).get();
        if (!snap.exists) {
          return res.status(404).json({ message: "Property location not found" });
        }

        const now = admin.firestore.Timestamp.now();
        const updateData = {
          ...parsed.data,
          updatedAt: now,
        };

        await propertiesLocationDoc(id as string).update(updateData);
        const updated = await propertiesLocationDoc(id as string).get();

        return res.json({ data: { id: updated.id, ...updated.data() } });
      } catch (error: any) {
        console.error("[BE] PATCH /properties-location/:id error:", error);
        return res.status(500).json({ message: "Failed to update property location" });
      }
    },
  );

  // DELETE /properties-location/:id - Delete property location
  router.delete(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesLocationDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property location not found" });
        }

        await propertiesLocationDoc(id as string).delete();

        return res.json({ message: "Property location deleted successfully" });
      } catch (error: any) {
        console.error("[BE] DELETE /properties-location/:id error:", error);
        return res.status(500).json({ message: "Failed to delete property location" });
      }
    },
  );

  return router;
}