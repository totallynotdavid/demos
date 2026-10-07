# postcard

A postcard design editor with a live preview, built with React, Vite and
Tailwind. Pick one of four layouts, adjust fonts, colors, spacing and paper
grain in the side panel, and print the card to PDF. The text on the card is the
sample spa postcard in
[`src/data/default-content.ts`](src/data/default-content.ts); the page has no
text editor.

Original design:
https://www.figma.com/design/ZjsDPyOpCQMdTPqYz8feU7/Spa-Company-Postcard-Design

```sh
bun install
cd apps/postcard
bun run dev      # http://localhost:3000, opens a browser tab
bun run build    # build to dist/
```

## Editor

- **Layouts**: classic, organic, swiss and ethereal. Each sets a default style
  ([`src/data/layout-presets.ts`](src/data/layout-presets.ts)). Choosing a
  layout replaces the style with that preset.
- **Style controls**: heading and body font, paper, ink and accent colors, edge
  padding, element gap and grain opacity
  ([`config-panel.tsx`](src/components/editor/config-panel.tsx)). The reset
  button restores the defaults.
- **View**: zoom from 50% to 150% and a toggle for the print texture
  ([`view-toolbar.tsx`](src/components/editor/view-toolbar.tsx)).
- **Export PDF**: sets the page title to the card title and opens the browser's
  print dialog. Choose "Save as PDF".

The Vite root is `src`, so `index.html` is at `src/index.html`.
