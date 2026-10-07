# dev3pack2

DevProof: a terminal-styled app that turns a goal and a level into a skills
roadmap, then sets a written challenge for each skill. It is a front-end demo.
There is no backend and no AI call: roadmaps and challenges come from fixed
lists, the grader is a word-count check, and the wallet address, transaction
hash and token ID on the achievement screen are random strings. Nothing is saved
between page loads.

```sh
bun install
cd apps/dev3pack2
bun run dev       # http://localhost:5173, also on your network
bun run build     # build to dist/
```

## Flow

The app is one page that switches between four screens
([`src/pages/Index.tsx`](src/pages/Index.tsx)):

1. **Onboarding**: a name, a goal (get a job, learn a new stack, specialize) and
   a level (junior, mid, senior).
2. **Roadmap**: ten skills for the goal. The first two (junior) or three (mid,
   senior) are available and the rest are locked.
3. **Challenge**: a prompt for the chosen skill and level. The answer passes
   when it has at least 20 (junior), 40 (mid) or 60 (senior) words and contains
   either a code keyword (`function`, `const `, `class `, a code fence) or more
   than 30 words. Passing completes the skill and unlocks the next one.
4. **Achievement**: a mock soulbound token for the completed skill.

## Code

| Path                                               | Holds                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [`src/lib/aiService.ts`](src/lib/aiService.ts)     | The skill and challenge lists, the grader and the fakes. Each call waits one to three seconds to look like a request. |
| [`src/lib/appContext.tsx`](src/lib/appContext.tsx) | App state and the `completeSkill` unlock rule.                                                                        |
| [`src/pages`](src/pages)                           | One component per screen.                                                                                             |
