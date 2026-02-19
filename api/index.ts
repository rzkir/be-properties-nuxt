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

// Use top-level await to ensure register happens before import
// This ensures tsconfig-paths is registered before src/index.ts imports are resolved
const appModule = await import("../src/index");
const app = appModule.default;

export default app;