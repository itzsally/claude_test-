import type { Book } from '../lib/types';
import { SearchField } from './SearchField';
import { SpineShelf } from './SpineShelf';
import styles from './Hero.module.css';

interface HeroProps {
  featured: Book[];
  query: string;
  onQueryChange: (value: string) => void;
  onSubmitSearch: () => void;
  /** Number of matches for the current query, or null while loading. */
  resultCount: number | null;
  catalogId: string;
  onOpenBook: (book: Book) => void;
}

export function Hero({
  featured,
  query,
  onQueryChange,
  onSubmitSearch,
  resultCount,
  catalogId,
  onOpenBook,
}: HeroProps) {
  return (
    <section className={styles.hero} id="top" aria-labelledby="hero-headline">
      <div className="shell">
        <div className={styles.eyebrowRow}>
          <span className={styles.rule} aria-hidden="true" />
          <span className="eyebrow">Open daily, quietly</span>
          <span className={styles.rule} aria-hidden="true" />
        </div>

        <h1 className={styles.headline} id="hero-headline">
          Find the next book <em>you&rsquo;ll love</em>
        </h1>

        <p className={styles.standfirst}>
          A small, carefully kept library with no ratings, no reviews and nothing to sell.
          Search it, wander it, or let today&rsquo;s recommendation decide for you.
        </p>

        <SearchField
          value={query}
          onChange={onQueryChange}
          onSubmit={onSubmitSearch}
          controls={catalogId}
        />

        <p className={styles.status} aria-live="polite">
          {query.trim() && resultCount !== null ? (
            <>
              {resultCount === 0
                ? 'Nothing on the shelves matches that yet — '
                : `${resultCount.toLocaleString()} ${
                    resultCount === 1 ? 'book matches' : 'books match'
                  } — `}
              <button type="button" className={styles.statusLink} onClick={onSubmitSearch}>
                see them below
              </button>
            </>
          ) : null}
        </p>

        <p className={styles.shelfHeading}>
          <span className={styles.rule} aria-hidden="true" />
          This week on the front shelf
          <span className={styles.rule} aria-hidden="true" />
        </p>
      </div>

      {featured.length > 0 ? <SpineShelf books={featured} onOpenBook={onOpenBook} /> : null}
    </section>
  );
}
