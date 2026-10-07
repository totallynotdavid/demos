import { startMonitor } from "./monitor";
import { createServer } from "./server";

const PORT = Number(process.env.PORT ?? 3000);

startMonitor();

const server = createServer(PORT);

console.log(`dokploy-status listening on ${server.url}`);
