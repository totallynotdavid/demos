import { attendance } from "./_lib/handlers.js";

export default {
  fetch: (request: Request) => attendance(request, process.env),
};
