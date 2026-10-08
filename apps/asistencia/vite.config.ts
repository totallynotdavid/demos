import { defineConfig, loadEnv, type Plugin } from "vite";

const ROUTE = /^\/api\/(attendance|form|register)$/;

// Vite does not run api/. This serves the same Web handlers Vercel runs, so
// the dev server works end to end.
function api(): Plugin {
  return {
    name: "asistencia-api",
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), [
        "SHEET_",
        "FORM_",
        "DASHBOARD_",
      ]);
      for (const [key, value] of Object.entries(env)) {
        process.env[key] ??= value;
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const route = ROUTE.exec(url.pathname)?.[1];
        if (!route) return next();

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk);
        const hasBody = req.method !== "GET" && req.method !== "HEAD";
        const request = new Request(url, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: hasBody ? Buffer.concat(chunks) : undefined,
        });
        const module = await server.ssrLoadModule(`/api/${route}.ts`);
        const response: Response = await module.default.fetch(request);

        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig({
  plugins: [api()],
  build: {
    rolldownOptions: {
      input: {
        main: "index.html",
        panel: "panel/index.html",
      },
    },
  },
});
