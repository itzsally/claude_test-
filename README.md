# The Reading Room

A calm, editorial digital library for discovering books. No ratings, no reviews,
no purchase links — just browsing, searching, filtering and a book a day.

Built with **React 19 + TypeScript + Vite**, plain CSS Modules, and no UI
framework. Every cover and spine is drawn in CSS and SVG, so the site ships no
cover imagery at all.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck, then bundle to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc -b
```

## How it is put together

```
src/
  components/   One component per file, each with a co-located .module.css
  data/         The catalog: genres, hand-written books, the generator
  hooks/        useLibrary (search/filter/sort/page), useDailyPick, useFocusTrap…
  lib/          Types, seeded PRNG, search + sort, cover/spine art derivation
  styles/       Design tokens and base styles
```

### The catalog

`LIBRARY_SIZE` is 2,400 books. Thirty-six are hand-written in
`src/data/curated.ts`; they lead the "Recommended" order, supply the featured
spines and provide the daily pick. The rest are generated at load time by
`src/data/generateCatalog.ts` from the per-genre word banks in
`src/data/vocabulary.ts` — a title pattern, a name, and three sentence
skeletons whose slots are filled from the same genre's vocabulary. Draws are
memoised per record, so a book that opens on an orchard is still talking about
that orchard three sentences later, and skeletons are dealt from a shuffled deck
so a single shelf never repeats a sentence shape twice in a row.

Everything is seeded (`src/lib/prng.ts`), so ids, covers and ordering survive a
reload.

### Swapping in a real API

`Book` in `src/lib/types.ts` is deliberately close to what a book API returns —
id, title, author, genre, tags, synopsis, year. No presentation data is stored
on the record: bindings, ornaments, spine widths and cover layouts are all
derived from the id by `src/lib/art.ts`, so records arriving from a network
source still render as individual objects.

Replacing the local catalog means changing one function:

```ts
// src/data/catalog.ts
export function loadCatalog(): Promise<Catalog> { … }   // → fetch('/api/books')
```

The generator and its word banks are already a separate chunk behind a dynamic
import, which is what gives the grid its brief skeleton state on first paint.

### Design notes

- One warm theme — ivory paper, deep ink, muted moss, faded gold — defined as
  tokens in `src/styles/global.css`. There is no dark variant; the paper is the
  identity of the place.
- Cormorant Garamond for display, Inter for controls and body copy, each with a
  full system fallback stack so the site still reads correctly offline.
- Motion is short and restrained, and every transition is disabled under
  `prefers-reduced-motion`.

### Accessibility

Semantic landmarks and a skip link; the detail panel is a real modal dialog with
a focus trap, Escape to dismiss and focus restored to the card that opened it;
the shelf works by hover, by tap (first tap previews, second opens) and by
keyboard; filter chips are toggle buttons with `aria-pressed`; result counts are
announced via `aria-live`; focus is always visible.
