import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { bookArt } from '../lib/art';
import { genreLabel } from '../data/genres';
import type { Book } from '../lib/types';
import { BookCover } from './BookCover';
import styles from './DailyPick.module.css';

interface DailyPickProps {
  book: Book | null;
  open: boolean;
  onToggle: (open: boolean) => void;
  onOpenBook: (book: Book) => void;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
};

/**
 * Today's recommendation, as a pill in the header that opens a small card.
 * Closes on Escape or a click elsewhere, and returns focus to the pill.
 */
export function DailyPick({ book, open, onToggle, onOpenBook }: DailyPickProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const cardId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggle(false);
        pillRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onToggle(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onToggle]);

  if (!book) return null;

  const art = bookArt(book);
  const today = new Date().toLocaleDateString(undefined, DATE_FORMAT);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        ref={pillRef}
        className={styles.pill}
        aria-label={`Daily recommendation: ${book.title}`}
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        onClick={() => onToggle(!open)}
      >
        <span
          className={styles.pillSpine}
          style={{ '--pick-binding': art.binding } as CSSProperties}
          aria-hidden="true"
        />
        <span className={styles.pillText}>
          <span className={styles.pillLabel}>Daily Recommendation</span>
          <span className={styles.pillShort} aria-hidden="true">
            Today&rsquo;s pick
          </span>
          <span className={styles.pillTitle}>{book.title}</span>
        </span>
      </button>

      {open ? (
        <div className={styles.card} id={cardId} role="group" aria-label="Today's recommendation">
          <BookCover book={book} scale={0.55} className={styles.cardCover} />
          <div className={styles.cardBody}>
            <p className={styles.cardDate}>{today}</p>
            <h2 className={styles.cardTitle}>{book.title}</h2>
            <p className={styles.cardAuthor}>{book.author}</p>
            <p className={styles.cardGenre}>{genreLabel(book.genre)}</p>
            <p className={styles.cardInvite}>
              Today&rsquo;s shelf is turned to this one. Give it ten quiet minutes and see
              whether it keeps you.
            </p>
            <button
              type="button"
              className={styles.cardOpen}
              onClick={() => {
                onToggle(false);
                onOpenBook(book);
              }}
            >
              Read the synopsis
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
