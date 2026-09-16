import { useId, useRef, useState } from 'react';
import type { Book } from '../lib/types';
import { genreLabel } from '../data/genres';
import { useHoverCapable } from '../hooks/useHoverCapable';
import { BookCover } from './BookCover';
import { BookSpine } from './BookSpine';
import styles from './SpineShelf.module.css';

interface SpineShelfProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
}

/**
 * The featured shelf. On a pointer device, hovering or focusing a spine pulls
 * it forward and fills the preview card below; on touch, the first tap does the
 * same and the card's own link opens the full record.
 */
export function SpineShelf({ books, onOpenBook }: SpineShelfProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const hoverCapable = useHoverCapable();
  const previewId = useId();

  /**
   * A tap focuses the button before it clicks it, which would make every first
   * tap look like a second one. Recording the shelf's state at pointer-down —
   * and noting when a click arrives without one, which means the keyboard —
   * keeps "first tap previews, second tap opens" working on touch.
   */
  const press = useRef({ fromPointer: false, wasActive: false });

  const active = books.find((book) => book.id === activeId) ?? null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.shelfScroll}>
        <ul className={styles.shelf}>
          {books.map((book) => (
            <li key={book.id} className={styles.slot}>
              <BookSpine
                book={book}
                active={book.id === activeId}
                previewId={previewId}
                onHover={hoverCapable ? () => setActiveId(book.id) : undefined}
                onHoverEnd={
                  hoverCapable
                    ? () => setActiveId((current) => (current === book.id ? null : current))
                    : undefined
                }
                onPointerDown={() => {
                  press.current = { fromPointer: true, wasActive: activeId === book.id };
                }}
                onFocus={() => setActiveId(book.id)}
                onBlur={() =>
                  setActiveId((current) => (current === book.id ? null : current))
                }
                onClick={() => {
                  const { fromPointer, wasActive } = press.current;
                  press.current = { fromPointer: false, wasActive: false };
                  // Pointer devices and the keyboard open the book directly;
                  // on touch the first tap only brings the card up.
                  if (hoverCapable || !fromPointer || wasActive) {
                    onOpenBook(book);
                  } else {
                    setActiveId(book.id);
                  }
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.board} />

      <div aria-live="polite">
        {active ? (
          <div className={styles.preview} id={previewId} key={active.id}>
            <BookCover book={active} scale={0.5} className={styles.previewCover} />
            <div className={styles.previewBody}>
              <span className={styles.previewGenre}>{genreLabel(active.genre)}</span>
              <h3 className={styles.previewTitle}>{active.title}</h3>
              <p className={styles.previewAuthor}>{active.author}</p>
              <p className={styles.previewText}>{active.synopsis}</p>
              <button
                type="button"
                className={styles.previewLink}
                onClick={() => onOpenBook(active)}
              >
                Open this book
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.previewEmpty}>
            {hoverCapable
              ? 'Hover a spine to look closer, or select one to open it.'
              : 'Tap a spine to look closer.'}
          </p>
        )}
      </div>
    </div>
  );
}
