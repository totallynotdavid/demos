# calendario

Generates a year of work and rest days for each worker. It runs entirely in the
browser: Vite + TypeScript, no server.

The generator is in `src/core`. It picks a schedule at random, so the same seed
gives the same year, and it checks the result against the seven rules before
returning it.

## Rules

1. Holidays: an isolated holiday is a rest day. Of two consecutive holidays the
   first is worked and the second is rest. A Sunday-Monday pair, or three in a
   row, is rejected.
2. Rest comes in blocks of exactly two days.
3. The first work day after rest is an ordering day.
4. Work blocks are 3 to 7 days long.
5. Each month has exactly one free weekend (Saturday and Sunday both rest).
6. Each ISO week has exactly one rest block.
7. A rest block never spans Sunday and Monday.

## Develop

Install once at the repository root, then:

```sh
bun install    # at the repository root
bun run dev    # start the dev server
bun run test   # run the tests
bun run build  # build to dist/
```

## Use the generator

```ts
import { generateCalendar } from "./core/index.ts";

const calendar = generateCalendar(2026, {
  holidays: ["2026-05-01", "2026-12-25"],
  seed: 42,
});
```

Holidays are `YYYY-MM-DD` strings. Some holiday sets leave no valid schedule,
for example a pair on January 1 and 2, which would leave a one-day work block at
the start of the year. Those throw an error.
