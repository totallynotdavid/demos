import { form } from "./_lib/handlers.js";

export default {
  fetch: (request: Request) => form(request, process.env),
};
