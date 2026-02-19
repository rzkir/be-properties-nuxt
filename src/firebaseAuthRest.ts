export async function firebaseAuthPost<T>(
  apiKey: string,
  path: string,
  body: unknown,
): Promise<T> {
  const url = `https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as FirebaseAuthRestError;
    const msg = data?.error?.message || `Firebase Auth REST error (${res.status})`;
    throw new Error(msg);
  }

  return (await res.json()) as T;
}