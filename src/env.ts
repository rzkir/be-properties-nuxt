import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3003),
  NODE_ENV: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_API_KEY: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  API_SECRET: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  SESSION_COOKIE_NAME: z.string().min(1).default("session"),
  SESSION_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(processEnv: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(processEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}