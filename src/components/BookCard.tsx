import { memo } from 'react';
import { genreLabel } from '../data/genres';
import type { Book } from '../lib/types';
import { BookCover } from './BookCover';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
}

/**
 * Cover-forward and deliberately sparse: cover, title, author, shelf. Anything
 * more belongs in the detail panel.
 */
export const BookCard = memo(function BookCard({ book, onOpen }: BookCardProps) {
  return (
    <button type="button" className={styles.card} onClick={() => onOpen(book)}>
      <span className={styles.coverWrap}>
        <BookCover book={book} scale={0.72} />
      </span>
      <span className={styles.meta}>
        <span className={styles.title}>{book.title}</span>
        <span className={styles.author}>{book.author}</span>
        <span className={styles.genre}>{genreLabel(book.genre)}</span>
      </span>
    </button>
  );
});

export function BookCardSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonCover} />
      <div className={styles.skeletonLine} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
    </div>
  );
}
