/**
 * Core domain types for the library.
 *
 * The shape here is intentionally close to what a real book API would return
 * (id / title / author / genre / tags / synopsis / year), so swapping the local
 * sample catalog for a network source means replacing `src/data/catalog.ts`
 * and nothing else. Everything purely presentational — the spine and cover
 * artwork — is derived from the record by `src/lib/art.ts` rather than stored,
 * so remote records without art still render.
 */

export type GenreId =
  | 'literary-fiction'
  | 'classics'
  | 'history'
  | 'science'
  | 'science-fiction'
  | 'philosophy'
  | 'fantasy'
  | 'mystery'
  | 'biography'
  | 'poetry'
  | 'psychology'
  | 'self-discovery';

export interface Genre {
  id: GenreId;
  /** Display name, e.g. "Literary Fiction". */
  label: string;
  /** One-line editorial description used in the catalog header. */
  blurb: string;
  /** Hue family the generated spines and covers draw from. */
  palette: GenrePalette;
}

export interface GenrePalette {
  /** Cloth colours a spine or cover board can be bound in. */
  bindings: string[];
  /** Ink colour that reads on those bindings. */
  ink: string;
  /** Foil/leaf colour for rules, ornaments and stamped detail. */
  foil: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: GenreId;
  /** One to three topical tags shown in the detail panel. */
  tags: string[];
  /** A two-to-three sentence synopsis. No marketing copy, no ratings. */
  synopsis: string;
  year: number;
  /** ISO date the record entered the library; drives "Recently Added". */
  addedAt: string;
  /** Editorial weight, 0–1. Drives "Recommended" ordering. */
  recommendation: number;
  /** True for hand-curated records; these lead the shelf and the catalog. */
  curated: boolean;
}

/** Deterministic visual identity derived from a book record. */
export interface BookArt {
  binding: string;
  ink: string;
  foil: string;
  /** Spine width in px at desktop scale. */
  spineWidth: number;
  /** Spine height as a fraction (0–1) of the shelf's tallest slot. */
  spineHeight: number;
  /** Ornament band drawn across the spine and cover. */
  ornament: OrnamentId;
  /** Which of the stamped title layouts the spine and cover use. */
  layout: 0 | 1 | 2;
  /** Whether the spine carries raised binding ridges. */
  ridges: boolean;
  /** Small rotation, in degrees, so shelved books lean a little. */
  lean: number;
}

export type OrnamentId =
  | 'rule'
  | 'diamond'
  | 'laurel'
  | 'chevron'
  | 'dots'
  | 'wave'
  | 'starburst'
  | 'lattice';

export type SortId = 'recommended' | 'recent' | 'title' | 'random';

export interface SortOption {
  id: SortId;
  label: string;
}
