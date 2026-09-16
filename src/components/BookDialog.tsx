import { useCallback, useId, useRef } from 'react';
import { genreLabel } from '../data/genres';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { Book } from '../lib/types';
import { BookCover } from './BookCover';
import styles from './BookDialog.module.css';

interface BookDialogProps {
  book: Book | null;
  onClose: () => void;
}

/**
 * The detail panel. A modal dialog with a focus trap, Escape to dismiss and
 * focus restored to the card that opened it.
 */
export function BookDialog({ book, onClose }: BookDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const dismiss = useCallback(() => onClose(), [onClose]);

  useFocusTrap(panelRef, book !== null, dismiss);

  if (!book) return null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <BookCover book={book} scale={1.25} className={styles.coverWrap} />

        <div className={styles.body}>
          <p className={styles.genre}>{genreLabel(book.genre)}</p>
          <h2 className={styles.title} id={titleId}>
            {book.title}
          </h2>
          <p className={styles.author}>
            {book.author} <em>· {book.year}</em>
          </p>

          <div className={styles.divider} aria-hidden="true" />

          <p className={styles.synopsis}>{book.synopsis}</p>

          {book.tags.length > 0 ? (
            <ul className={styles.tags} aria-label="Topics">
              {book.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <p className={styles.footnote}>
            Shelved under {genreLabel(book.genre)} in The Reading Room.
          </p>
        </div>

        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <line x1="4" y1="4" x2="14" y2="14" strokeLinecap="round" />
            <line x1="14" y1="4" x2="4" y2="14" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
