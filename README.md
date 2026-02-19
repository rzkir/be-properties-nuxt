# Backend (Express + TypeScript + Firebase Admin)

## Setup

1. Copy env example:

```bash
cp .env.example .env
```

2. Set Firebase Admin credentials:

- Recommended: set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON file path.
- Also set `FIREBASE_STORAGE_BUCKET`.

3. Install & run:

```bash
npm install
npm run dev
```

## Endpoints

- `GET /health`
- `POST /upload` (multipart form-data `file`, requires header `x-api-secret`)
- `GET /me` (requires `Authorization: Bearer <firebase idToken>`)
- `PATCH /me` (requires `Authorization: Bearer <firebase idToken>`)
# be-properties-nuxt
