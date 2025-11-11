// services/geminiService.ts
// Frontend helper to interact with Cloudflare Pages Functions (R2 upload + Gemini proxy)

export async function uploadImageToR2(base64Data: string, filename = 'image.png', contentType = 'image/png') {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, base64: base64Data, contentType }),
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return res.json(); // { key: 'uploads/...' }
}

/**
 * Edit an image stored in R2.
 * - key: the R2 key returned by uploadImageToR2
 * - prompt: text instruction
 * - endpoint: the Google GenAI REST endpoint you want to call (see README)
 * - mimeType: original image mime type, optional
 */
export async function editImageByKey(key: string, prompt: string, endpoint: string, mimeType = 'image/png') {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'edit',
      key,
      prompt,
      endpoint,
      mimeType,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Generation failed: ${txt}`);
  }
  return res.json(); // proxied response from GenAI
}

/**
 * Generic proxy helper if you already have the payload ready client-side and want backend to add auth and forward it.
 * - endpoint: full URL of the Google GenAI REST endpoint
 * - payload: object that will be JSON.stringified as the request body
 */
export async function proxyToGemini(endpoint: string, payload: any) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'proxy',
      endpoint,
      payload,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Proxy failed: ${txt}`);
  }
  return res.json();
}