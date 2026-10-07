# asistencia

Attendance form for one event, in Spanish. A visitor types a name, answers "Sí"
or "No", and the answer lands in a Google Form. There is no database and no
login.

The page is static (Vite, plain JavaScript). One serverless function sits
between it and Google.

```sh
bun install
cd apps/asistencia
bun run dev       # serves the page at the URL Vite prints
bun run build     # build to dist/
```

## How a submission travels

1. [`src/main.js`](src/main.js) posts `{ name, attendance }` as JSON to
   `/api/register`. It shows an inline error if the response is not
   `{ "ok": true }`.
2. [`api/register.js`](api/register.js) accepts only `POST` (otherwise `405`)
   and requires `attendance` to be `Sí` or `No` (otherwise `400`).
3. It forwards the answer to the Google Form's `formResponse` URL as
   form-encoded data. It returns `502` if Google rejects it and `{ "ok": true }`
   otherwise.

The form URL and the two field IDs, `entry.856162853` (name) and
`entry.51289651` (attendance), are constants at the top of `api/register.js`. To
record into another form, change them there.

The Vite dev server does not run `api/`, so submitting from `bun run dev`
returns a `404` and the page shows its error message. The function runs on
Vercel; see [deployment](../../docs/deployment.md).
