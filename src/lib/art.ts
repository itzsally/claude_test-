import { GENRE_BY_ID } from '../data/genres';
import { createRandom, hashString, pick, range } from './prng';
import type { Book, BookArt, OrnamentId } from './types';

const ORNAMENTS: OrnamentId[] = [
  'rule',
  'diamond',
  'laurel',
  'chevron',
  'dots',
  'wave',
  'starburst',
  'lattice',
];

/** Deep ink used when a binding is too pale to carry the genre's light ink. */
const DEEP_INK = '#241f19';

/** Perceived lightness of a #rrggbb colour, 0–1. */
export function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Mix a colour toward white or black by `amount` (-1 shade … 1 tint). */
export function shift(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const target = amount >= 0 ? 255 : 0;
  const weight = Math.abs(amount);
  const channel = (start: number) =>
    Math.round(start + (target - start) * weight)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(parseInt(value.slice(0, 2), 16))}${channel(
    parseInt(value.slice(2, 4), 16),
  )}${channel(parseInt(value.slice(4, 6), 16))}`;
}

const cache = new Map<string, BookArt>();

/**
 * Derive a book's binding, ornament and proportions from its id. Art is not
 * stored on the record, so books arriving from a future API still get a
 * consistent, individual look — and the same book always looks the same.
 */
export function bookArt(book: Book): BookArt {
  const cached = cache.get(book.id);
  if (cached) return cached;

  const random = createRandom(hashString(book.id));
  const palette = GENRE_BY_ID[book.genre].palette;
  const binding = pick(random, palette.bindings);
  const pale = luminance(binding) > 0.6;

  const art: BookArt = {
    binding,
    ink: pale ? DEEP_INK : palette.ink,
    foil: pale ? shift(palette.foil, -0.25) : palette.foil,
    spineWidth: range(random, 34, 72),
    spineHeight: 0.74 + random() * 0.26,
    ornament: pick(random, ORNAMENTS),
    layout: range(random, 0, 2) as 0 | 1 | 2,
    ridges: random() > 0.55,
    lean: (random() - 0.5) * 2.4,
  };

  cache.set(book.id, art);
  return art;
}

/** The surname alone, which is all a spine has room to stamp. */
export function authorSurname(author: string): string {
  const parts = author.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? author;
}

/**
 * Stamped titles are set in whatever size the spine can actually hold. Long
 * titles step down rather than overflow, and wider spines carry larger type.
 */
export function spineTitleSize(title: string, spineWidth: number): string {
  const base =
    title.length > 34 ? 0.68 : title.length > 26 ? 0.76 : title.length > 18 ? 0.86 : 0.96;
  return `${(base * (0.86 + spineWidth / 260)).toFixed(3)}rem`;
}

/** Initials stamped on covers that use the monogram layout. */
export function authorInitials(author: string): string {
  return author
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}
