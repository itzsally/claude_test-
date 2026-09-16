import type { Book } from '../lib/types';

/**
 * The library's advertised size. The curated records are written by hand and
 * the remainder are generated, which keeps the bundle small while the catalog
 * behaves like a real collection: thousands of searchable, filterable records.
 */
export const LIBRARY_SIZE = 2400;

export interface Catalog {
  books: Book[];
  featured: Book[];
  byId: Map<string, Book>;
}

let pending: Promise<Catalog> | null = null;

/**
 * Load the catalog. The generator and its word banks live in a separate chunk,
 * so the shell paints first and the grid shows its skeleton for the moment the
 * records take to arrive. Swapping this for `fetch('/api/books')` is the whole
 * change required to move to a real backend.
 */
export function loadCatalog(): Promise<Catalog> {
  if (!pending) {
    pending = (async () => {
      const [{ CURATED_BOOKS, FEATURED_IDS }, { generateBooks }] = await Promise.all([
        import('./curated'),
        import('./generateCatalog'),
      ]);

      const generated = generateBooks(
        LIBRARY_SIZE - CURATED_BOOKS.length,
        CURATED_BOOKS.map((book) => book.title),
      );
      const books = [...CURATED_BOOKS, ...generated];
      const byId = new Map(books.map((book) => [book.id, book]));
      const featured = FEATURED_IDS.map((id) => byId.get(id)).filter(
        (book): book is Book => Boolean(book),
      );

      return { books, featured, byId };
    })();
  }
  return pending;
}
