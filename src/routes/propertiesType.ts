import { Router } from "express";

import admin from "firebase-admin";

import { z } from "zod";

import { requireAuth, getUser } from "@/middleware/auth.js";

export function createPropertiesTypeRouter(opts: { sessionCookieName: string }) {
  const router = Router();

  const CreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    propertiesId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional().default(true),
  });

  const UpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    propertiesId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  });

  function propertiesTypeCollection() {
    return admin.firestore().collection(process.env.FIREBASE_COLLECTION_PROPERTIES_TYPE as string);
  }

  function propertiesTypeDoc(id: string) {
    return propertiesTypeCollection().doc(id);
  }

  // GET /properties-type - List all property types
  router.get(
    "/",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const snapshot = await propertiesTypeCollection()
          .orderBy("createdAt", "desc")
          .get();

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.json({ data });
      } catch (error: any) {
        console.error("[BE] GET /properties-type error:", error);
        return res.status(500).json({ message: "Failed to fetch property types" });
      }
    },
  );

  // GET /properties-type/:id - Get single property type
  router.get(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesTypeDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property type not found" });
        }

        return res.json({ data: { id: snap.id, ...snap.data() } });
      } catch (error: any) {
        console.error("[BE] GET /properties-type/:id error:", error);
        return res.status(500).json({ message: "Failed to fetch property type" });
      }
    },
  );

  // POST /properties-type - Create new property type
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

        const docRef = await propertiesTypeCollection().add(data);
        const created = await docRef.get();

        return res.status(201).json({
          data: { id: created.id, ...created.data() }
        });
      } catch (error: any) {
        console.error("[BE] POST /properties-type error:", error);
        return res.status(500).json({ message: "Failed to create property type" });
      }
    },
  );

  // PATCH /properties-type/:id - Update property type
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

        const snap = await propertiesTypeDoc(id as string).get();
        if (!snap.exists) {
          return res.status(404).json({ message: "Property type not found" });
        }

        const now = admin.firestore.Timestamp.now();
        const updateData = {
          ...parsed.data,
          updatedAt: now,
        };

        await propertiesTypeDoc(id as string).update(updateData);
        const updated = await propertiesTypeDoc(id as string).get();

        return res.json({ data: { id: updated.id, ...updated.data() } });
      } catch (error: any) {
        console.error("[BE] PATCH /properties-type/:id error:", error);
        return res.status(500).json({ message: "Failed to update property type" });
      }
    },
  );

  // DELETE /properties-type/:id - Delete property type
  router.delete(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesTypeDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property type not found" });
        }

        await propertiesTypeDoc(id as string).delete();

        return res.json({ message: "Property type deleted successfully" });
      } catch (error: any) {
        console.error("[BE] DELETE /properties-type/:id error:", error);
        return res.status(500).json({ message: "Failed to delete property type" });
      }
    },
  );

  return router;
}
