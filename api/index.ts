import "dotenv/config";
import { register } from "tsconfig-paths";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register path aliases BEFORE importing app
register({
  baseUrl: resolve(__dirname, "../src"),
  paths: {
    "@/*": ["*"],
  },
});

// Import from src - Vercel will compile TypeScript automatically with @vercel/node
// Note: ES modules require .js extension even for TypeScript files
const appModule = (await import("../src/index.js")) as { default: Express };
const app = appModule.default;

export default app;