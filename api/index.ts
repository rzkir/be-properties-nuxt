import "dotenv/config";
import type { Express } from "express";

// Import the app directly - no need for path aliases anymore
const appModule = await import("../src/index.js");
const app = (appModule.default || appModule) as Express;

export default app;