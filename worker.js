export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve static files from Cloudflare Workers Assets.
    let response = await env.ASSETS.fetch(request);

    // SPA/PWA fallback: if a user opens a deep route directly, return index.html.
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (response.status === 404 && acceptsHtml) {
      const indexRequest = new Request(`${url.origin}/index.html`, request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    // Basic security/cache headers for a browser PWA.
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (url.pathname.endsWith('sw.js')) {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
