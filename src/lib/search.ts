import type { Book, SortId } from './types';
import { GENRE_BY_ID } from '../data/genres';
import { createRandom, hashString } from './prng';

/** Lowercase and strip accents so "Ines" finds "Inês". */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const haystacks = new WeakMap<Book, string>();

function haystack(book: Book): string {
  let value = haystacks.get(book);
  if (value === undefined) {
    value = normalise(
      [book.title, book.author, GENRE_BY_ID[book.genre].label, ...book.tags].join(' '),
    );
    haystacks.set(book, value);
  }
  return value;
}

/** Every whitespace-separated term must appear somewhere in the record. */
export function matchesQuery(book: Book, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const value = haystack(book);
  return terms.every((term) => value.includes(term));
}

export function toTerms(query: string): string[] {
  return normalise(query).split(/\s+/).filter(Boolean);
}

/**
 * Sort a filtered list. "Random Discovery" is seeded per shuffle so the order
 * holds still while paging through it, and only changes when re-requested.
 */
export function sortBooks(books: Book[], sort: SortId, randomSeed: number): Book[] {
  const sorted = books.slice();

  switch (sort) {
    case 'recommended':
      return sorted.sort(
        (a, b) =>
          Number(b.curated) - Number(a.curated) ||
          b.recommendation - a.recommendation ||
          a.title.localeCompare(b.title),
      );
    case 'recent':
      return sorted.sort(
        (a, b) => b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title),
      );
    case 'title':
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      );
    case 'random': {
      const weights = new Map(
        sorted.map((book) => [
          book.id,
          createRandom(hashString(book.id) ^ randomSeed)(),
        ]),
      );
      return sorted.sort((a, b) => (weights.get(a.id) ?? 0) - (weights.get(b.id) ?? 0));
    }
    default:
      return sorted;
  }
}
