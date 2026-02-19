import "dotenv/config";

import express from "express";

import cors from "cors";

import { fileURLToPath } from "url";

import { dirname, join } from "path";

import { loadEnv } from "./env.js";

import { getFirebaseAdminApp } from "./firebase.js";

import { healthRouter } from "./routes/health.js";

import { createAccountsRouter } from "./routes/accounts.js";

import { createUploadRouter } from "./routes/upload.js";

import { createAuthRouter } from "./routes/auth.js";

import { createImagekitRouter } from "./routes/imagekit.js";

import { createPropertiesTypeRouter } from "./routes/propertiesType.js";

import { createPropertiesLocationRouter } from "./routes/propertiesLocation.js";

import { createPropertiesBadgeRouter } from "./routes/propertiesBadge.js";

const env = loadEnv(process.env);

getFirebaseAdminApp({
  projectId: env.FIREBASE_PROJECT_ID,
});

const app = express();

const origins =
  env.CORS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// Serve static files from public directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, "../public")));

// Serve documentation HTML
app.get("/docs", (_req, res) => {
  res.sendFile(join(__dirname, "../public/index.html"));
});

app.use(healthRouter);
app.use(
  createAuthRouter({
    firebaseApiKey: env.FIREBASE_API_KEY,
    cookieName: env.SESSION_COOKIE_NAME,
    sessionExpiresDays: env.SESSION_EXPIRES_DAYS,
    cookieSecure:
      env.COOKIE_SECURE ?? (env.NODE_ENV === "production"),
  }),
);
app.use(createAccountsRouter({ sessionCookieName: env.SESSION_COOKIE_NAME }));
app.use(createUploadRouter({ apiSecret: env.API_SECRET }));
app.use(createImagekitRouter({ privateKey: env.IMAGEKIT_PRIVATE_KEY }));
app.use("/properties-type", createPropertiesTypeRouter({ sessionCookieName: env.SESSION_COOKIE_NAME }));
app.use("/properties-location", createPropertiesLocationRouter({ sessionCookieName: env.SESSION_COOKIE_NAME }));
app.use("/properties-badge", createPropertiesBadgeRouter({ sessionCookieName: env.SESSION_COOKIE_NAME }));

// Only start server if not in Vercel environment
if (process.env.VERCEL !== "1") {
  app.listen(env.PORT, () => {
    console.log(`[BE] listening on http://localhost:${env.PORT}`);
  });
}

// Export for Vercel serverless function
export default app;