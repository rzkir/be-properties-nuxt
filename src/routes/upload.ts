import { Router } from "express";

import multer from "multer";

import { z } from "zod";

import { requireApiSecret } from "../middleware/apiSecret.js";

import imagekit from "../imgkit.js";

export function createUploadRouter(opts: {
  apiSecret?: string;
}): Router {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const QuerySchema = z.object({
    folder: z.string().trim().min(1).max(80).optional(),
  });

  router.post(
    "/upload",
    requireApiSecret(opts.apiSecret),
    upload.single("file"),
    async (req, res) => {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "Missing file" });

      const q = QuerySchema.safeParse(req.query);
      const folder = q.success && q.data.folder ? q.data.folder : "uploads";

      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${folder}/${Date.now()}-${safeName}`;

      try {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: safeName,
          folder: `/${folder}`,
          useUniqueFileName: true,
        });

        return res.json({
          url: result.url,
          path: result.filePath ?? objectPath,
          contentType: file.mimetype,
          size: file.size,
        });
      } catch (err) {
        return res
          .status(500)
          .json({ message: "Failed to upload image to ImageKit" });
      }
    },
  );

  return router;
}