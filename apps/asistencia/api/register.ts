import { register } from "./_lib/handlers.js";

export default {
  fetch: (request: Request) => register(request, process.env),
};
