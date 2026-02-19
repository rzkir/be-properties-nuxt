import { Router } from "express";

import multer from "multer";

import admin from "firebase-admin";

import { z } from "zod";

import { requireAuth, getUser } from "../middleware/auth.js";

import imagekit from "../imgkit.js";

export function createPropertiesRouter(opts: { sessionCookieName: string }) {
  const router = Router();

  // Multer configuration for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      // Accept only image files
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  // Schema for PropertyLoc, PropertyType, PropertyBadge (nested objects)
  const PropertyLocSchema = z.object({
    name: z.string().trim().min(1),
    locationsId: z.string().trim().min(1),
  });

  const PropertyTypeSchema = z.object({
    name: z.string().trim().min(1),
    propertiesId: z.string().trim().min(1),
  });

  const PropertyBadgeSchema = z.object({
    name: z.string().trim().min(1),
    badgesId: z.string().trim().min(1),
  });

  const CreateSchema = z.object({
    title: z.string().trim().min(1).max(200),
    location: PropertyLocSchema,
    type: PropertyTypeSchema,
    badges: z.array(PropertyBadgeSchema).optional().default([]),
    content: z.string().trim().min(1),
    thumbnailUrl: z.string().trim().min(1),
    imageUrl: z.array(z.string().trim()).optional().default([]),
    bedrooms: z.string().trim().min(1),
    bathrooms: z.string().trim().min(1),
    area: z.string().trim().min(1),
    price: z.string().trim().min(1),
    priceValue: z.number().positive("Price value must be positive"),
    propertiesId: z.string().trim().min(1).optional(),
  });

  const UpdateSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    location: PropertyLocSchema.optional(),
    type: PropertyTypeSchema.optional(),
    badges: z.array(PropertyBadgeSchema).optional(),
    content: z.string().trim().min(1).optional(),
    thumbnailUrl: z.string().trim().min(1).optional(),
    imageUrl: z.array(z.string().trim()).optional(),
    bedrooms: z.string().trim().min(1).optional(),
    bathrooms: z.string().trim().min(1).optional(),
    area: z.string().trim().min(1).optional(),
    price: z.string().trim().min(1).optional(),
    priceValue: z.number().positive().optional(),
    propertiesId: z.string().trim().min(1).optional(),
  });

  function propertiesCollection() {
    return admin.firestore().collection(process.env.FIREBASE_COLLECTION_PROPERTIES as string);
  }

  function propertiesDoc(id: string) {
    return propertiesCollection().doc(id);
  }

  // POST /properties/upload/thumbnail - Upload thumbnail to ImageKit
  router.post(
    "/upload/thumbnail",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    upload.single("file"),
    async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        
        try {
          const result = await imagekit.upload({
            file: file.buffer,
            fileName: safeName,
            folder: "/properties/thumbnails",
            useUniqueFileName: true,
          });

          return res.json({
            url: result.url,
            path: result.filePath,
            contentType: file.mimetype,
            size: file.size,
          });
        } catch (err: any) {
          console.error("[BE] ImageKit upload error:", err);
          return res.status(500).json({ 
            message: "Failed to upload thumbnail to ImageKit",
            error: err.message 
          });
        }
      } catch (error: any) {
        console.error("[BE] POST /properties/upload/thumbnail error:", error);
        return res.status(500).json({ message: "Failed to upload thumbnail" });
      }
    },
  );

  // POST /properties/upload/image - Upload image to ImageKit
  router.post(
    "/upload/image",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    upload.single("file"),
    async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        
        try {
          const result = await imagekit.upload({
            file: file.buffer,
            fileName: safeName,
            folder: "/properties/images",
            useUniqueFileName: true,
          });

          return res.json({
            url: result.url,
            path: result.filePath,
            contentType: file.mimetype,
            size: file.size,
          });
        } catch (err: any) {
          console.error("[BE] ImageKit upload error:", err);
          return res.status(500).json({ 
            message: "Failed to upload image to ImageKit",
            error: err.message 
          });
        }
      } catch (error: any) {
        console.error("[BE] POST /properties/upload/image error:", error);
        return res.status(500).json({ message: "Failed to upload image" });
      }
    },
  );

  // GET /properties - List all properties
  router.get(
    "/",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const snapshot = await propertiesCollection()
          .orderBy("createdAt", "desc")
          .get();

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.json({ data });
      } catch (error: any) {
        console.error("[BE] GET /properties error:", error);
        return res.status(500).json({ message: "Failed to fetch properties" });
      }
    },
  );

  // GET /properties/:id - Get single property
  router.get(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property not found" });
        }

        return res.json({ data: { id: snap.id, ...snap.data() } });
      } catch (error: any) {
        console.error("[BE] GET /properties/:id error:", error);
        return res.status(500).json({ message: "Failed to fetch property" });
      }
    },
  );

  // POST /properties - Create new property
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

        const docRef = await propertiesCollection().add(data);
        const created = await docRef.get();

        return res.status(201).json({
          data: { id: created.id, ...created.data() }
        });
      } catch (error: any) {
        console.error("[BE] POST /properties error:", error);
        return res.status(500).json({ message: "Failed to create property" });
      }
    },
  );

  // PATCH /properties/:id - Update property
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

        const snap = await propertiesDoc(id as string).get();
        if (!snap.exists) {
          return res.status(404).json({ message: "Property not found" });
        }

        const now = admin.firestore.Timestamp.now();
        const updateData = {
          ...parsed.data,
          updatedAt: now,
        };

        await propertiesDoc(id as string).update(updateData);
        const updated = await propertiesDoc(id as string).get();

        return res.json({ data: { id: updated.id, ...updated.data() } });
      } catch (error: any) {
        console.error("[BE] PATCH /properties/:id error:", error);
        return res.status(500).json({ message: "Failed to update property" });
      }
    },
  );

  // DELETE /properties/:id - Delete property
  router.delete(
    "/:id",
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const snap = await propertiesDoc(id as string).get();

        if (!snap.exists) {
          return res.status(404).json({ message: "Property not found" });
        }

        await propertiesDoc(id as string).delete();

        return res.json({ message: "Property deleted successfully" });
      } catch (error: any) {
        console.error("[BE] DELETE /properties/:id error:", error);
        return res.status(500).json({ message: "Failed to delete property" });
      }
    },
  );

  return router;
}
