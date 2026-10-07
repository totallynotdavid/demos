# calendario

Generates a year of work and rest days for each worker under seven rules. It
runs entirely in the browser: Vite and TypeScript, no server. The page is in
Spanish.

```sh
bun install
cd apps/calendario
bun run dev    # start the dev server
bun run test   # run the tests
bun run build  # build to dist/
```

In the page, pick a year (2024 to 2030), add workers by name and press "Generar
horario". Each worker gets a calendar. The seed comes from the worker's name and
the year, so the same name and year always give the same calendar. "Guardar
configuración" stores the year and the names in `localStorage` under
`calendario:config`. The page passes no holidays.

## Rules

The generator ([`src/core`](src/core)) searches for a schedule at random and
checks the result against these rules before it returns it
([`validation.ts`](src/core/validation.ts)).

1. Holidays: an isolated holiday is a rest day. Of two consecutive holidays the
   first is worked and the second is rest. A Sunday-Monday pair, or three in a
   row, is rejected.
2. Rest comes in blocks of exactly two days.
3. The first work day after a rest day or holiday is an ordering day.
4. Work blocks are 3 to 7 days long.
5. Each month has exactly one free weekend (Saturday and Sunday both rest).
6. Each ISO week has exactly one rest block. A week cut by the start or end of
   the year counts only its days inside the year.
7. A rest block never spans Sunday and Monday.

## Use the generator

```ts
import { generateCalendar } from "./core/index.ts";

const calendar = generateCalendar(2026, {
  holidays: ["2026-05-01", "2026-12-25"],
  seed: 42,
});
```

`generateCalendar(year, { holidays, seed })` returns a `Calendar` with one `Day`
per date. A day's `dayType` is `WORK`, `REST`, `ORDERING`, `HOLIDAY` or
`WORKING_HOLIDAY`. Holidays are `YYYY-MM-DD` strings in the target year. With a
`seed` the result repeats; without one every call differs.
`generateMultipleCalendars(year, workers, { holidays, baseSeed })` builds one
calendar per worker, using seed `baseSeed + i` for worker `i`.

Invalid input throws an `Error`: a year outside 1 to 9999, a malformed or
duplicate holiday, a holiday outside the year, and the holiday patterns rule 1
rejects. Some valid holiday sets also leave no schedule, for example a pair on
January 1 and 2, which would leave a one-day work block at the start of the
year. Those throw too.
