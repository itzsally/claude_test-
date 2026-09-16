import type { CSSProperties } from 'react';
import { authorSurname, bookArt, spineTitleSize } from '../lib/art';
import { genreLabel } from '../data/genres';
import type { Book } from '../lib/types';
import { Ornament } from './Ornament';
import styles from './BookSpine.module.css';

interface BookSpineProps {
  book: Book;
  active: boolean;
  /** Id of the preview card this spine describes while it is active. */
  previewId: string;
  /** Omitted on touch devices, where there is nothing to hover. */
  onHover?: () => void;
  onHoverEnd?: () => void;
  /** Fires before focus, so the shelf can tell a first tap from a second. */
  onPointerDown: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
}

/**
 * One book seen edge-on. Width, height, binding, ornament and lean all come
 * from `bookArt`, so a shelf of these reads as a row of individual objects
 * rather than one component repeated.
 */
export function BookSpine({
  book,
  active,
  previewId,
  onHover,
  onHoverEnd,
  onPointerDown,
  onFocus,
  onBlur,
  onClick,
}: BookSpineProps) {
  const art = bookArt(book);
  const style = {
    '--binding': art.binding,
    '--ink-on-binding': art.ink,
    '--foil': art.foil,
    '--spine-w': art.spineWidth,
    '--spine-h': art.spineHeight,
    '--lean': `${art.lean}deg`,
    '--title-size': spineTitleSize(book.title, art.spineWidth),
  } as CSSProperties;

  return (
    <button
      type="button"
      className={[styles.spine, art.ridges && styles.ridged, active && styles.active]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-label={`${book.title} by ${book.author}, ${genreLabel(book.genre)}`}
      aria-describedby={active ? previewId : undefined}
      onPointerDown={onPointerDown}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
    >
      <span className={styles.band} aria-hidden="true">
        <Ornament kind={art.ornament} className={styles.bandSvg} />
      </span>
      <span className={styles.label} aria-hidden="true">
        <span className={styles.title}>{book.title}</span>
        <span className={styles.author}>{authorSurname(book.author)}</span>
      </span>
      <span className={styles.band} aria-hidden="true">
        <Ornament kind={art.ornament} className={styles.bandSvg} />
      </span>
    </button>
  );
}
