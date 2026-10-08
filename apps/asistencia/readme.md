# asistencia

Attendance for one event, in Spanish, on top of a Google Form.

- **`/`** is a registration page. A visitor types a name, answers "Sí" or "No"
  and the answer lands in your Google Form.
- **`/panel/`** is the attendee list. It reads the Form's linked Google Sheet,
  shows who confirmed, who declined and who answered something else, and
  refreshes itself every 30 seconds.

There is no database and no login. Google Forms and Sheets stay the source of
truth, so everything you already do with the Sheet (formulas, exports, sharing)
keeps working.

## Set it up

You need a Google Form with two questions, a short answer for the name and a
multiple choice for the attendance, and the Sheet linked to its responses. The
event title and date come from the Form's title and description, so you do not
type them anywhere else.

1. **Link the Sheet.** In the Form, open **Responses > Link to Sheets**.
2. **Share the Sheet.** In the Sheet, choose **Share > General access > Anyone
   with the link > Viewer**. The panel can only read a Sheet that is shared this
   way. Nobody who has the link can edit it.
3. **Copy two links.**
   - `SHEET_URL`: the address of the Sheet, copied from the browser while the
     responses tab is open.
   - `FORM_URL`: the Form's **Send > Link** (a `forms.gle` link works).
4. **Deploy.** In Vercel, create a project with Root Directory `apps/asistencia`
   and set `SHEET_URL` and `FORM_URL` as environment variables. See
   [deployment](../../docs/deployment.md).
5. **Optional: protect the list.** Set `DASHBOARD_KEY` and the panel asks for it
   before it shows names. Registration stays open.

The panel finds the name, attendance and timestamp columns by their headings and
types. Rename the tab or add columns freely. If someone answers twice, only
their latest answer counts, ignoring case and accents.

### What each message means

| Message                                      | Fix                                                   |
| -------------------------------------------- | ----------------------------------------------------- |
| No se pudo abrir el Sheet                    | Share the Sheet with "Anyone with the link" as Viewer |
| Falta la variable `SHEET_URL` / `FORM_URL`   | Set the variable, then redeploy                       |
| El Sheet necesita una columna con el nombre… | Keep a name column and an attendance column           |
| No pudimos abrir el formulario               | Check `FORM_URL`, and that the Form accepts responses |
| La pregunta de asistencia debe tener…        | Give the choice question the options "Sí" and "No"    |
| Todavía no hay respuestas                    | Nothing is wrong. Nobody has answered yet             |

## Run it locally

```sh
bun install
cd apps/asistencia
cp .env.example .env     # then fill in SHEET_URL and FORM_URL
bun run dev              # serves the pages and the API at the URL Vite prints
bun run test             # parsing, ingestion and handler tests
bun run typecheck
bun run build            # writes dist/ with both pages
```

The dev server runs the same handlers as Vercel, so registration and the panel
work locally.

## How it works

| Route                 | File                                     | Does                                    |
| --------------------- | ---------------------------------------- | --------------------------------------- |
| `GET /api/form`       | [`api/form.ts`](api/form.ts)             | Reads the Form: title, date, questions  |
| `POST /api/register`  | [`api/register.ts`](api/register.ts)     | Submits `{ name, attendance }` to Forms |
| `GET /api/attendance` | [`api/attendance.ts`](api/attendance.ts) | Reads the Sheet and counts the answers  |

The handlers live in [`api/_lib`](api/_lib). Imports inside `api/` end in `.js`
even though the files are `.ts`: Vercel compiles each function to JavaScript and
keeps the specifier as written, so a `.ts` specifier fails at runtime with
`ERR_MODULE_NOT_FOUND`.

**Reading answers.** The server asks Google's Sheets query endpoint for the tab
as JSON (`/spreadsheets/d/<id>/gviz/tq?tqx=out:json`). It needs no API key, no
Google Cloud project and no script in the Sheet, only the "Anyone with the link"
share. Dates arrive as typed values, so day/month order never depends on the
Sheet's locale. The result is cached for 20 seconds and shared between visitors,
so a crowded panel makes one request to Google per 20 seconds.

**Writing answers.** `/api/form` reads the question ids and the exact option
text ("Sí", "No") from the Form page, and `/api/register` posts to the Form's
own `formResponse` address. Nothing about the Form is hard coded, so pointing
`FORM_URL` at another Form is the whole migration. Every answer still passes
through Google Forms, with its timestamp and response limits.

**Limits.** Google can change the Form page layout without notice, which would
break `/api/form` and `/api/register` until the parser is updated. The panel
depends on the Sheet staying shared. A Sheet or Form that is private, deleted or
not accepting responses shows a message instead of a blank page.

The decision record behind the reading method is in
[docs/architecture.md](../../docs/architecture.md#asistencia-google-forms-ingestion).
