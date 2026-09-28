import { getHistory, getLatest, startMonitor } from "./monitor";

const PORT = Number(process.env.PORT ?? 3000);

const indexHtmlPath = new URL("../public/index.html", import.meta.url);
const indexHtml = await Bun.file(indexHtmlPath).text();

startMonitor();

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  routes: {
    "/": () =>
      new Response(indexHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    "/api/stats": () =>
      Response.json({ latest: getLatest(), history: getHistory() }),
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`dokploy-status listening on ${server.url}`);
