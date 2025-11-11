// functions/api/upload.ts
export async function onRequest(context: any) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { filename = 'file.png', base64, contentType = 'image/png' } = body || {};

    if (!base64) {
      return new Response(JSON.stringify({ error: 'no base64 provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // normalize base64 (remove data: prefix if present)
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    // decode base64 to Uint8Array
    const binaryString = atob(raw);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

    const key = `uploads/${Date.now()}-${filename}`;

    // IMAGES_BUCKET must be bound to your R2 bucket in Cloudflare Pages settings
    await env.IMAGES_BUCKET.put(key, bytes, {
      httpMetadata: {
        contentType,
      },
    });

    return new Response(JSON.stringify({ key }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}