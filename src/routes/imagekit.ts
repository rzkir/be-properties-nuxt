import crypto from "crypto";

import type { Router } from "express";

import { Router as createRouter } from "express";

export function createImagekitRouter(opts: { privateKey?: string }): Router {
  const router = createRouter();

  router.get("/imagekit/auth", (req, res) => {
    if (!opts.privateKey) {
      return res
        .status(500)
        .json({ message: "IMAGEKIT_PRIVATE_KEY is not configured" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const expire = Math.floor(Date.now() / 1000) + 30 * 60;

    const signature = crypto
      .createHmac("sha1", opts.privateKey)
      .update(token + expire)
      .digest("hex");

    return res.json({ token, expire, signature });
  });

  return router;
}