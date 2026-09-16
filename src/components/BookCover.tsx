import type { CSSProperties } from 'react';
import { authorInitials, bookArt } from '../lib/art';
import type { Book } from '../lib/types';
import { Ornament } from './Ornament';
import styles from './BookCover.module.css';

interface BookCoverProps {
  book: Book;
  /**
   * Scales the stamped type with the rendered size of the cover. 1 suits a
   * grid card; raise it for the detail panel, lower it for a thumbnail.
   */
  scale?: number;
  className?: string;
}

/**
 * A front cover drawn entirely in CSS and SVG — cloth binding, foil rules and
 * a stamped ornament — so the library needs no cover imagery and every book
 * still looks like a specific object.
 */
export function BookCover({ book, scale = 1, className }: BookCoverProps) {
  const art = bookArt(book);
  const style = {
    '--binding': art.binding,
    '--ink-on-binding': art.ink,
    '--foil': art.foil,
    '--cover-scale': scale,
  } as CSSProperties;

  return (
    <div
      className={[styles.cover, styles[`layout${art.layout}`], className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-hidden="true"
    >
      <span className={styles.frame} />
      <div className={styles.text}>
        {art.layout === 1 ? (
          <>
            <span className={styles.title}>{book.title}</span>
            <Ornament kind={art.ornament} className={`${styles.band} ${styles.bandLarge}`} />
            <span className={styles.author}>{book.author}</span>
          </>
        ) : art.layout === 2 ? (
          <>
            <Ornament kind={art.ornament} className={styles.band} />
            <span className={styles.spacer} />
            <span className={styles.medallion}>{authorInitials(book.author)}</span>
            <span className={styles.spacer} />
            <span className={styles.title}>{book.title}</span>
            <span className={styles.author}>{book.author}</span>
          </>
        ) : (
          <>
            <Ornament kind={art.ornament} className={styles.band} />
            <span className={styles.title}>{book.title}</span>
            <span className={styles.author}>{book.author}</span>
            <Ornament kind={art.ornament} className={styles.band} />
          </>
        )}
      </div>
    </div>
  );
}
