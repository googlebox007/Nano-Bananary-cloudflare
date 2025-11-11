// functions/api/gemini.ts
export async function onRequest(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured in environment' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const action = body?.action;

    if (action === 'edit') {
      const { key, prompt, endpoint, mimeType = 'image/png' } = body;
      if (!key) return new Response(JSON.stringify({ error: 'missing key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      if (!endpoint) return new Response(JSON.stringify({ error: 'missing endpoint' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

      // read object from R2
      const obj = await env.IMAGES_BUCKET.get(key);
      if (!obj) return new Response(JSON.stringify({ error: 'object not found in R2' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      const arrayBuffer = await obj.arrayBuffer();
      const u8 = new Uint8Array(arrayBuffer);
      // convert to base64
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < u8.length; i += chunkSize) {
        const chunk = u8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);

      // Construct payload expected by GenAI REST endpoint.
      const payload = body.payload ?? {
        prompt,
        image: {
          imageBytes: base64,
          mimeType,
        },
      };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      const ct = resp.headers.get('content-type') || '';
      // try parse json if possible
      if (ct.includes('application/json')) {
        return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
      }
      // otherwise return as-is
      return new Response(text, { status: resp.status, headers: { 'Content-Type': ct || 'text/plain' } });
    } else if (action === 'proxy') {
      const { endpoint, payload } = body;
      if (!endpoint) return new Response(JSON.stringify({ error: 'missing endpoint' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload ?? {}),
      });

      const text = await resp.text();
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(text, { status: resp.status, headers: { 'Content-Type': ct || 'text/plain' } });
    } else {
      return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}