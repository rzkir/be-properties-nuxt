import "dotenv/config";
import type { Express } from "express";

// Import from dist folder after build (no .d.ts for compiled output)
// @ts-expect-error - dist/index.js is compiled output, no declaration file
const appModule = (await import("../dist/index.js")) as { default: Express };
const app = appModule.default;

export default app;