import { getHistory, getLatest } from "./monitor";

const indexHtmlPath = new URL("../public/index.html", import.meta.url);
const indexHtml = await Bun.file(indexHtmlPath).text();

export function createServer(port: number) {
  // Bun answers HEAD for a GET route, so GET and HEAD are the served methods.
  const routes = {
    "/": {
      GET: () =>
        new Response(indexHtml, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
    "/api/stats": {
      GET: () => Response.json({ latest: getLatest(), history: getHistory() }),
    },
  };

  return Bun.serve({
    port,
    hostname: "0.0.0.0",
    routes,
    // Reached for unknown paths and for a known path with another method.
    fetch(request) {
      if (new URL(request.url).pathname in routes) {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { allow: "GET, HEAD" },
        });
      }
      return new Response("Not Found", { status: 404 });
    },
  });
}
