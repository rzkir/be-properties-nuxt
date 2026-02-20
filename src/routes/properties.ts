import { Router } from "express";

import multer from "multer";

import admin from "firebase-admin";

import { z } from "zod";

import { requireAuth, getUser } from "../middleware/auth.js";

import { requireApiSecret } from "../middleware/apiSecret.js";

import imagekit from "../imgkit.js";

export function createPropertiesRouter(opts: { sessionCookieName: string; apiSecret?: string }) {
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
    propertiesTypeId: z.string().trim().min(1),
  });

  const PropertyBadgeSchema = z.object({
    name: z.string().trim().min(1),
    badgesId: z.string().trim().min(1),
  });

  const AuthorSchema = z.object({
    displayName: z.string().trim(),
    email: z.string().trim(),
    phoneNumber: z.string().trim(),
    photoURL: z.string().trim().optional(),
  });

  // Helper function to generate slug from title
  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const CreateSchema = z.object({
    title: z.string().trim().min(1).max(200),
    slug: z.string().trim().min(1).optional(),
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
    propertiesTypeId: z.string().trim().min(1).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  });

  const UpdateSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).optional(),
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
    propertiesTypeId: z.string().trim().min(1).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    author: AuthorSchema.optional(), // Diterima tapi tidak di-update (tetap pakai yang lama)
  });

  function propertiesCollection() {
    return admin.firestore().collection(process.env.FIREBASE_COLLECTION_PROPERTIES as string);
  }

  function propertiesDoc(id: string) {
    return propertiesCollection().doc(id);
  }

  const requireApi = requireApiSecret(opts.apiSecret);

  // POST /properties/upload/thumbnail - Upload thumbnail to ImageKit
  router.post(
    "/upload/thumbnail",
    requireApi,
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
    requireApi,
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

  const mapDocToList = (doc: { id: string; data: () => Record<string, unknown> }) => {
    const raw = doc.data() as any;
    return {
      id: doc.id,
      title: raw.title,
      slug: raw.slug,
      location: raw.location,
      propertiesTypeId: raw.propertiesTypeId,
      type: raw.type,
      badges: raw.badges,
      thumbnailUrl: raw.thumbnailUrl,
      bedrooms: raw.bedrooms,
      bathrooms: raw.bathrooms,
      area: raw.area,
      price: raw.price,
      priceValue: raw.priceValue,
    };
  };

  // GET /properties - List all properties (query: page)
  router.get(
    "/",
    requireApi,
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const limit = 10;
        const pageParam = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
        const page = pageParam ? Math.max(parseInt(pageParam as string, 10) || 1, 1) : 1;

        let query = propertiesCollection().orderBy("createdAt", "desc").limit(limit + 1);
        const offset = (page - 1) * limit;
        if (offset > 0) {
          query = query.offset(offset);
        }
        const snapshot = await query.get();
        const hasNextPage = snapshot.docs.length > limit;
        const docs = snapshot.docs.slice(0, limit);
        const data = docs.map(mapDocToList);

        return res.json({
          data,
          page,
          limit,
          nextPage: hasNextPage,
          prevPage: page > 1,
        });
      } catch (error: any) {
        console.error("[BE] GET /properties error:", error);
        return res.status(500).json({ message: "Failed to fetch properties" });
      }
    },
  );

  // GET /properties/search - Search properties (query: q, page)
  router.get(
    "/search",
    requireApi,
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const limit = 10;
        const pageParam = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
        const page = pageParam ? Math.max(parseInt(pageParam as string, 10) || 1, 1) : 1;
        const qParam = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
        const q = typeof qParam === "string" ? qParam.trim() : "";

        if (!q) {
          return res.status(400).json({ message: "Query parameter 'q' is required for search" });
        }

        const searchLower = q.toLowerCase();
        const maxScan = 500;
        const snapshot = await propertiesCollection()
          .orderBy("createdAt", "desc")
          .limit(maxScan)
          .get();

        const filtered = snapshot.docs.filter((doc) => {
          const raw = doc.data() as any;
          const title = (raw.title ?? "").toLowerCase();
          const slug = (raw.slug ?? "").toLowerCase();
          const locName = (raw.location?.name ?? "").toLowerCase();
          return (
            title.includes(searchLower) ||
            slug.includes(searchLower) ||
            locName.includes(searchLower)
          );
        });

        const totalFiltered = filtered.length;
        const offset = (page - 1) * limit;
        const docs = filtered.slice(offset, offset + limit);
        const data = docs.map((d) => mapDocToList(d));
        const hasNextPage = offset + limit < totalFiltered;
        const prevPage = page > 1;

        return res.json({
          data,
          page,
          limit,
          nextPage: hasNextPage,
          prevPage,
        });
      } catch (error: any) {
        console.error("[BE] GET /properties/search error:", error);
        return res.status(500).json({ message: "Failed to search properties" });
      }
    },
  );

  // GET /properties/:id - Get single property
  router.get(
    "/:id",
    requireApi,
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

  // Helper: build author from Firebase user
  async function buildAuthorFromUid(uid: string) {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return {
        displayName: userRecord.displayName ?? "",
        email: userRecord.email ?? "",
        phoneNumber: userRecord.phoneNumber ?? "",
        // Pastikan tidak pernah mengirim undefined ke Firestore
        photoURL: userRecord.photoURL ?? "",
      };
    } catch {
      return null;
    }
  }

  // POST /properties - Create new property
  router.post(
    "/",
    requireApi,
    requireAuth({ sessionCookieName: opts.sessionCookieName }),
    async (req, res) => {
      try {
        const authUser = getUser(req);
        const parsed = CreateSchema.safeParse(req.body);

        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid body",
            errors: parsed.error.issues,
          });
        }

        const now = admin.firestore.Timestamp.now();
        // Auto-generate slug from title if not provided
        const slug = parsed.data.slug || generateSlug(parsed.data.title);

        // Author dari user yang login (Firebase Auth)
        const author = await buildAuthorFromUid(authUser.uid);

        const data = {
          ...parsed.data,
          slug,
          ...(author && { author }),
          createdAt: now,
          updatedAt: now,
          createdBy: authUser.uid,
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
    requireApi,
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
        // Auto-generate slug from title if title is updated and slug is not provided
        let slug = parsed.data.slug;
        if (parsed.data.title && !parsed.data.slug) {
          slug = generateSlug(parsed.data.title);
        }
        // Jangan update author - tetap pakai yang sudah ada
        const { author: _author, ...restParsed } = parsed.data as Record<string, unknown>;
        const updateData = {
          ...restParsed,
          ...(slug && { slug }),
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
    requireApi,
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
