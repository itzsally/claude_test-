import { GENRE_BY_ID } from '../data/genres';
import { LIBRARY_SIZE } from '../data/catalog';
import { PAGE_SIZE } from '../hooks/useLibrary';
import type { Library } from '../hooks/useLibrary';
import type { Book } from '../lib/types';
import { BookCard, BookCardSkeleton } from './BookCard';
import { SortControl } from './SortControl';
import { TopicFilter } from './TopicFilter';
import styles from './Catalog.module.css';

interface CatalogProps {
  library: Library;
  id: string;
  onOpenBook: (book: Book) => void;
}

/** Below the fold: the whole collection, filtered and sorted in place. */
export function Catalog({ library, id, onOpenBook }: CatalogProps) {
  const {
    status,
    results,
    visible,
    hasMore,
    counts,
    queryCount,
    query,
    setQuery,
    genre,
    setGenre,
    sort,
    setSort,
    reshuffle,
    loadMore,
  } = library;

  const loading = status === 'loading';
  const filtering = query.trim().length > 0 || genre !== 'all';
  const shelfBlurb = genre === 'all' ? null : GENRE_BY_ID[genre].blurb;

  return (
    <section className={styles.section} id="discover" aria-labelledby="catalog-heading">
      <div className="shell">
        <div className={styles.head}>
          <div>
            <p className="eyebrow">The Collection</p>
            <h2 className={styles.heading} id="catalog-heading">
              Explore the Library
            </h2>
            <p className={styles.count}>
              <strong>{LIBRARY_SIZE.toLocaleString()} books</strong> to discover
              {shelfBlurb ? ` · ${shelfBlurb}` : ''}
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <TopicFilter
            selected={genre}
            counts={counts}
            totalCount={queryCount}
            onSelect={setGenre}
          />
          <div className={styles.controlsRow}>
            <p className={styles.resultLine} aria-live="polite">
              {loading
                ? 'Opening the catalogue…'
                : `Showing ${visible.length.toLocaleString()} of ${results.length.toLocaleString()} ${
                    results.length === 1 ? 'book' : 'books'
                  }`}
            </p>
            <SortControl value={sort} onChange={setSort} onReshuffle={reshuffle} />
          </div>
        </div>

        {loading ? (
          <ul className={styles.grid} id={id} aria-busy="true" aria-label="Loading books">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <li key={index}>
                <BookCardSkeleton />
              </li>
            ))}
          </ul>
        ) : results.length === 0 ? (
          <div className={styles.empty} id={id}>
            <h3 className={styles.emptyTitle}>Nothing on these shelves</h3>
            <p className={styles.emptyText}>
              We keep {LIBRARY_SIZE.toLocaleString()} books here, but none of them answer
              to that yet. Try a broader term, or put the whole library back on view.
            </p>
            <button
              type="button"
              className={styles.emptyAction}
              onClick={() => {
                setQuery('');
                setGenre('all');
              }}
            >
              Clear {filtering ? 'search and filters' : 'filters'}
            </button>
          </div>
        ) : (
          <>
            <ul className={styles.grid} id={id}>
              {visible.map((book) => (
                <li key={book.id}>
                  <BookCard book={book} onOpen={onOpenBook} />
                </li>
              ))}
            </ul>

            {hasMore ? (
              <div className={styles.more}>
                <button type="button" className={styles.moreButton} onClick={loadMore}>
                  Load more books
                </button>
                <p className={styles.moreNote}>
                  {(results.length - visible.length).toLocaleString()} more waiting
                </p>
              </div>
            ) : (
              <div className={styles.more}>
                <p className={styles.moreNote}>
                  That&rsquo;s the end of this shelf.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
