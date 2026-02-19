import admin from "firebase-admin";

let cached: admin.app.App | null = null;

function tryDeriveProjectIdFromCred(
  cred:
    | admin.credential.Credential
    | (admin.credential.Credential & { projectId?: string })
    | undefined,
): string | undefined {
  if (!cred) return undefined;
  const anyCred = cred as unknown as { projectId?: string };
  return anyCred.projectId;
}

export function getFirebaseAdminApp(opts: {
  projectId?: string;
}): admin.app.App {
  if (cached) return cached;

  const already = admin.apps[0];
  if (already) {
    cached = already;
    return cached;
  }

  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY;

  let credential: admin.credential.Credential;
  if (clientEmail && privateKey) {
    credential = admin.credential.cert({
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      projectId: opts.projectId,
    });
  } else {
    credential = admin.credential.applicationDefault();
  }

  const app = admin.initializeApp(
    {
      credential,
      projectId: opts.projectId,
    },
  );

  cached = app;
  return app;
}

export function getProjectId(app: admin.app.App): string | undefined {
  const explicit = app.options.projectId;
  if (explicit) return explicit;
  return tryDeriveProjectIdFromCred(app.options.credential);
}

