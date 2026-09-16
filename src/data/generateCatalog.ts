import { createRandom, pick, range, shuffle } from '../lib/prng';
import type { Book, GenreId } from '../lib/types';
import { GENRES } from './genres';
import { LIBRARY_EPOCH } from './curated';
import {
  FIRST_NAMES,
  ORDINALS,
  SEASONS,
  SPANS,
  SURNAMES,
  VERBS,
  VOCABULARY,
} from './vocabulary';
import type { GenreVocabulary } from './vocabulary';

const DAY = 86400000;

/** Words that stay lowercase inside a title unless they open it. */
/**
 * Relative shelf sizes. A real library is not evenly divided, and chips reading
 * exactly 200 for all twelve topics gives the game away immediately.
 */
const GENRE_WEIGHT: Record<GenreId, number> = {
  'literary-fiction': 1.55,
  classics: 1.0,
  history: 1.15,
  science: 0.95,
  'science-fiction': 1.05,
  philosophy: 0.8,
  fantasy: 1.1,
  mystery: 1.2,
  biography: 0.85,
  poetry: 0.6,
  psychology: 0.9,
  'self-discovery': 0.75,
};

/** Expand the weights into one genre slot per book, then shuffle the deal. */
function dealGenres(count: number, random: () => number): GenreId[] {
  const total = GENRES.reduce((sum, genre) => sum + GENRE_WEIGHT[genre.id], 0);
  const slots: GenreId[] = [];

  for (const genre of GENRES) {
    const share = Math.round((count * GENRE_WEIGHT[genre.id]) / total);
    for (let index = 0; index < share; index += 1) slots.push(genre.id);
  }
  // Rounding can leave the deal a book or two short or long.
  while (slots.length < count) slots.push(GENRES[slots.length % GENRES.length].id);
  slots.length = count;

  return shuffle(random, slots);
}

const MINOR_WORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'in', 'at', 'to', 'for', 'on', 'with',
  'without', 'between', 'from', 'by', 'as', 'but', 'or', 'nor',
]);

type Memo = Map<string, string>;

/**
 * Draw a value for one token. Repeat draws of the same token return the
 * memoised value; numbered variants (`noun2`) draw something different.
 */
function drawValue(
  token: string,
  vocab: GenreVocabulary,
  random: () => number,
  memo: Memo,
  properPlace: boolean,
): string {
  const key = properPlace ? 'Place' : token;
  const base = token.replace(/\d+$/, '');
  const existing = memo.get(key);
  if (existing !== undefined) return existing;

  // Avoid any word already drawn for this record, not just one from the same
  // bank: 'Habit' lives in both the nouns and the abstracts, and "The Habit of
  // Habit" is the kind of thing that gives a generated catalog away.
  const alreadyUsed = new Set([...memo.values()].map((value) => value.toLowerCase()));

  const banks: Record<string, readonly string[]> = {
    noun: vocab.nouns,
    abstract: vocab.abstracts,
    adj: vocab.adjectives,
    place: properPlace ? (vocab.titlePlaces ?? vocab.places) : vocab.places,
    figure: vocab.figures,
    span: SPANS,
    season: SEASONS,
    verb: VERBS,
    ordinal: ORDINALS,
  };

  const bank = banks[base];
  let value: string;
  if (bank) {
    value = pick(random, bank);
    for (let attempt = 0; attempt < 8 && alreadyUsed.has(value.toLowerCase()); attempt += 1) {
      value = pick(random, bank);
    }
  } else if (base === 'name') {
    value = `${pick(random, FIRST_NAMES)} ${pick(random, SURNAMES)}`;
  } else if (base === 'era') {
    // The period a history title names, not the year the book was published.
    value = String(range(random, 1348, 1975));
  } else {
    value = '';
  }

  memo.set(key, value);
  return value;
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .map((word, index) =>
      index > 0 && MINOR_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/** Silent-h words that take "an" even though they open on a consonant. */
const SOUNDS_VOWEL = /^(heir|honest|honou?r|hour)/i;

/** Words that open on a vowel but sound like "y" or "w", so they take "a". */
const SOUNDS_CONSONANT = /^(on(e|ce)|uni|eu|us(e|er|ing)|utility|ubiquit)/i;

/**
 * Make every indefinite article agree with the word after it. Templates carry
 * a literal "A " before a slot ("A {noun} of {abstract}"), and whichever word
 * the slot draws decides whether that should read "a" or "an".
 */
function fixArticles(value: string): string {
  return value.replace(
    /\b([Aa]n?)\b(\s+)([A-Za-z][\w'\u2019-]*)/g,
    (_match, article: string, gap: string, word: string) => {
      const vowelSound = SOUNDS_CONSONANT.test(word)
        ? false
        : SOUNDS_VOWEL.test(word) || /^[aeiou]/i.test(word);
      const wanted = vowelSound ? 'an' : 'a';
      const cased =
        article[0] === article[0].toUpperCase()
          ? wanted.charAt(0).toUpperCase() + wanted.slice(1)
          : wanted;
      return `${cased}${gap}${word}`;
    },
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/**
 * Fill a template's `{token}` slots. A capitalised token capitalises its value;
 * `:lower` and `:title` recase it; `:an` prefixes the right indefinite article.
 * Draws are memoised per record, so a book that opens on an orchard is still
 * talking about that orchard three sentences later.
 */
function fill(
  template: string,
  vocab: GenreVocabulary,
  random: () => number,
  memo: Memo,
): string {
  return template.replace(/\{([^}]+)\}/g, (_match, body: string) => {
    const segments = String(body).split(':');
    const tokenSegment =
      segments.find((segment) => !['an', 'lower', 'title'].includes(segment)) ?? '';
    const modifiers = new Set(segments.filter((segment) => segment !== tokenSegment));

    const shouldCapitalise = /^[A-Z]/.test(tokenSegment);
    const token = tokenSegment.charAt(0).toLowerCase() + tokenSegment.slice(1);
    // `{Place}` in a title draws a proper name, already cased for use mid-title.
    const properPlace = shouldCapitalise && token === 'place' && Boolean(vocab.titlePlaces);

    let value = drawValue(token, vocab, random, memo, properPlace);
    if (!value) return '';

    if (modifiers.has('lower')) value = value.toLowerCase();
    if (modifiers.has('title')) value = titleCase(value);
    if (shouldCapitalise && !properPlace) value = capitalise(value);
    if (modifiers.has('an')) value = `${article(value)} ${value}`;

    return value;
  });
}

function yearFor(genre: GenreId, random: () => number): number {
  if (genre === 'classics') return range(random, 1804, 1912);
  if (genre === 'history' || genre === 'philosophy') return range(random, 1948, 2026);
  return range(random, 1961, 2026);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function buildTitle(pattern: string, vocab: GenreVocabulary, random: () => number, memo: Memo): string {
  const raw = fixArticles(fill(pattern, vocab, random, memo));
  return capitalise(raw.replace(/: (.)/g, (_m, c: string) => `: ${c.toUpperCase()}`));
}

/**
 * Deals from a shuffled deck and reshuffles when it runs out, so a skeleton is
 * never reused until every other one in its genre has had a turn. Without this,
 * filtering to a single shelf surfaces the same sentence shape a few rows apart.
 */
function createDealer<T>(items: readonly T[], random: () => number): () => T {
  let deck: T[] = [];
  let last: T | undefined;
  return () => {
    if (deck.length === 0) {
      deck = shuffle(random, items);
      // Don't let a reshuffle repeat the card that just came off the old deck.
      if (deck.length > 1 && deck[deck.length - 1] === last) {
        [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
      }
    }
    last = deck.pop() as T;
    return last;
  };
}

interface GenreDealers {
  title: () => string;
  opener: () => string;
  middle: () => string;
  closer: () => string;
}

function buildSynopsis(
  vocab: GenreVocabulary,
  random: () => number,
  memo: Memo,
  dealers: GenreDealers,
): string {
  const sentences = [
    fill(dealers.opener(), vocab, random, memo),
    fill(dealers.middle(), vocab, random, memo),
    fill(dealers.closer(), vocab, random, memo),
  ];
  // Two- or three-sentence synopses; the closer is dropped on shorter entries.
  const kept = random() > 0.35 ? sentences : sentences.slice(0, 2);
  return kept.map((sentence) => capitalise(fixArticles(sentence))).join(' ');
}

/**
 * Build the generated portion of the library. Deterministic for a given seed,
 * so ids, covers and ordering survive a reload.
 */
export function generateBooks(
  count: number,
  reservedTitles: readonly string[] = [],
  seed = 20260916,
): Book[] {
  const random = createRandom(seed);
  const books: Book[] = [];
  const usedTitles = new Set(reservedTitles.map((title) => title.toLowerCase()));
  const usedIds = new Set<string>();

  const deal = dealGenres(count, random);

  const dealers = new Map<GenreId, GenreDealers>(
    GENRES.map((genre) => [
      genre.id,
      {
        title: createDealer(VOCABULARY[genre.id].titlePatterns, random),
        opener: createDealer(VOCABULARY[genre.id].openers, random),
        middle: createDealer(VOCABULARY[genre.id].middles, random),
        closer: createDealer(VOCABULARY[genre.id].closers, random),
      },
    ]),
  );

  for (let index = 0; index < count; index += 1) {
    const genre = deal[index];
    const vocab = VOCABULARY[genre];
    const dealer = dealers.get(genre) as GenreDealers;

    const author = `${pick(random, FIRST_NAMES)} ${pick(random, SURNAMES)}`;
    const authorSurname = author.split(' ')[1];

    /** Seeds `{name}` so a biography's subject is never the author. */
    const freshMemo = (): Memo => {
      let subject = `${pick(random, FIRST_NAMES)} ${pick(random, SURNAMES)}`;
      for (let attempt = 0; attempt < 5 && subject.endsWith(authorSurname); attempt += 1) {
        subject = `${pick(random, FIRST_NAMES)} ${pick(random, SURNAMES)}`;
      }
      return new Map([['name', subject]]);
    };

    let memo: Memo = freshMemo();
    let year = yearFor(genre, random);
    let title = buildTitle(dealer.title(), vocab, random, memo);

    for (let attempt = 0; attempt < 8 && usedTitles.has(title.toLowerCase()); attempt += 1) {
      memo = freshMemo();
      year = yearFor(genre, random);
      title = buildTitle(dealer.title(), vocab, random, memo);
    }
    if (usedTitles.has(title.toLowerCase())) {
      // A fresh memo seeded with the title's own words: the slots draw again,
      // but the uniqueness check still sees what the title already used.
      const blocked: Memo = new Map(
        [...memo.values()].map((value, position) => [`blocked${position}`, value]),
      );
      title = `${title}: ${fill('{abstract} and {abstract2}', vocab, random, blocked)}`;
    }
    usedTitles.add(title.toLowerCase());

    let id = slugify(title);
    if (!id || usedIds.has(id)) id = `${id || 'untitled'}-${index}`;
    usedIds.add(id);

    const tags = shuffle(random, vocab.tags).slice(0, range(random, 1, 3));

    books.push({
      id,
      title,
      author,
      genre,
      tags,
      synopsis: buildSynopsis(vocab, random, memo, dealer),
      year,
      addedAt: new Date(LIBRARY_EPOCH - range(random, 1, 2200) * DAY).toISOString(),
      recommendation: Math.round(random() * 76) / 100,
      curated: false,
    });
  }

  return books;
}
