import "dotenv/config";

import express from "express";

import cors from "cors";

import { loadEnv } from "./env";

import { getFirebaseAdminApp } from "./firebase";

import { healthRouter } from "./routes/health";

import { createAccountsRouter } from "./routes/accounts";

import { createUploadRouter } from "./routes/upload";

import { createAuthRouter } from "./routes/auth";

import { createImagekitRouter } from "./routes/imagekit";

import { createPropertiesTypeRouter } from "./routes/propertiesType";

import { createPropertiesLocationRouter } from "./routes/propertiesLocation";

import { createPropertiesBadgeRouter } from "./routes/propertiesBadge";

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