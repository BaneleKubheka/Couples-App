export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    async function withNoStore(responsePromise) {
      const response = await responsePromise;
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      headers.set("X-Couples-Connect-Build", "cachekill-no-calls-admin-unlink");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    const response = await env.ASSETS.fetch(request);

    if (response.status !== 404) {
      return withNoStore(Promise.resolve(response));
    }

    if (request.method === "GET" && !url.pathname.includes(".")) {
      return withNoStore(env.ASSETS.fetch(new Request(new URL("/index.html", url), request)));
    }

    return withNoStore(Promise.resolve(response));
  }
};
