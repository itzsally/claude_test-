import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { loadCatalog } from '../data/catalog';
import type { Catalog } from '../data/catalog';
import { matchesQuery, sortBooks, toTerms } from '../lib/search';
import type { Book, GenreId, SortId } from '../lib/types';

export const PAGE_SIZE = 24;

export interface Library {
  status: 'loading' | 'ready';
  books: Book[];
  featured: Book[];
  /** Matches for the current query and topic, in the current sort order. */
  results: Book[];
  /** The slice currently rendered. */
  visible: Book[];
  hasMore: boolean;
  /** Per-topic counts for the current query, so chips show live numbers. */
  counts: Map<GenreId, number>;
  /** Matches for the current query, before the topic filter is applied. */
  queryCount: number;
  query: string;
  setQuery: (value: string) => void;
  genre: GenreId | 'all';
  setGenre: (value: GenreId | 'all') => void;
  sort: SortId;
  setSort: (value: SortId) => void;
  reshuffle: () => void;
  loadMore: () => void;
}

/**
 * Everything the catalog needs: load once, then filter, sort and page entirely
 * in memory. Filtering runs against a deferred copy of the query so typing
 * stays responsive while thousands of records are re-sorted.
 */
export function useLibrary(): Library {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQueryValue] = useState('');
  const [genre, setGenreValue] = useState<GenreId | 'all'>('all');
  const [sort, setSortValue] = useState<SortId>('recommended');
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.floor(Math.random() * 2 ** 30));
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then((loaded) => {
      if (!cancelled) setCatalog(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const deferredQuery = useDeferredValue(query);
  const terms = useMemo(() => toTerms(deferredQuery), [deferredQuery]);

  // Query first: the topic counts are counts *within* the current search.
  const queryMatches = useMemo(() => {
    if (!catalog) return [];
    if (terms.length === 0) return catalog.books;
    return catalog.books.filter((book) => matchesQuery(book, terms));
  }, [catalog, terms]);

  const counts = useMemo(() => {
    const tally = new Map<GenreId, number>();
    for (const book of queryMatches) {
      tally.set(book.genre, (tally.get(book.genre) ?? 0) + 1);
    }
    return tally;
  }, [queryMatches]);

  const results = useMemo(() => {
    const filtered =
      genre === 'all' ? queryMatches : queryMatches.filter((book) => book.genre === genre);
    return sortBooks(filtered, sort, shuffleSeed);
  }, [queryMatches, genre, sort, shuffleSeed]);

  // Any change to what is being shown returns the reader to the first page.
  useEffect(() => {
    setPage(1);
  }, [deferredQuery, genre, sort, shuffleSeed]);

  const visible = useMemo(() => results.slice(0, page * PAGE_SIZE), [results, page]);

  const setQuery = useCallback((value: string) => setQueryValue(value), []);
  const setGenre = useCallback((value: GenreId | 'all') => setGenreValue(value), []);
  const setSort = useCallback((value: SortId) => setSortValue(value), []);
  const reshuffle = useCallback(
    () => setShuffleSeed(Math.floor(Math.random() * 2 ** 30)),
    [],
  );
  const loadMore = useCallback(() => setPage((current) => current + 1), []);

  return {
    status: catalog ? 'ready' : 'loading',
    books: catalog?.books ?? [],
    featured: catalog?.featured ?? [],
    results,
    visible,
    hasMore: visible.length < results.length,
    counts,
    queryCount: queryMatches.length,
    query,
    setQuery,
    genre,
    setGenre,
    sort,
    setSort,
    reshuffle,
    loadMore,
  };
}
