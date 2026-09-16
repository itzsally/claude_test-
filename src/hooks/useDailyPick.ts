import { useMemo } from 'react';
import { hashString } from '../lib/prng';
import type { Book } from '../lib/types';

/** Today's date as YYYY-MM-DD in the reader's own timezone. */
export function todayKey(now = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * One book a day, chosen from the curated shelf by hashing the date. Everyone
 * opening the site on the same day sees the same recommendation, and it changes
 * at midnight without any scheduling.
 */
export function useDailyPick(books: Book[]): Book | null {
  const key = todayKey();

  return useMemo(() => {
    const pool = books.filter((book) => book.curated);
    const source = pool.length > 0 ? pool : books;
    if (source.length === 0) return null;
    return source[hashString(key) % source.length];
  }, [books, key]);
}
