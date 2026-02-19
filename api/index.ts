import "dotenv/config";
import { register } from "tsconfig-paths";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register path aliases BEFORE importing app
register({
  baseUrl: resolve(__dirname, "../src"),
  paths: {
    "@/*": ["*"],
  },
});

// Import using relative path - Vercel will compile TypeScript automatically
// Use .js extension because TypeScript compiles to .js
const appModule = await import("../src/index.js");
const app = appModule.default;

export default app;