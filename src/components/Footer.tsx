import { LIBRARY_SIZE } from '../data/catalog';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="shell">
        <div className={styles.rule} aria-hidden="true" />
        <div className={styles.inner}>
          <p className={styles.wordmark}>The Reading Room</p>
          <p className={styles.note}>
            A reading room of {LIBRARY_SIZE.toLocaleString()} books, kept for browsing
            rather than buying. Covers are drawn rather than photographed, and the shelves
            are restocked by hand.
          </p>
        </div>
      </div>
    </footer>
  );
}
