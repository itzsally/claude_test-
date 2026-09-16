import { useEffect, useState } from 'react';
import type { Book } from '../lib/types';
import { DailyPick } from './DailyPick';
import styles from './Header.module.css';

interface HeaderProps {
  dailyPick: Book | null;
  onOpenBook: (book: Book) => void;
}

/**
 * Minimal masthead: wordmark, three navigation links and today's
 * recommendation. It gains a hairline rule once the page has scrolled so it
 * stays unobtrusive over the hero.
 */
export function Header({ dailyPick, onOpenBook }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`shell ${styles.inner}`}>
        <a className={styles.brand} href="#top">
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.wordmark}>The Reading Room</span>
        </a>

        <nav className={styles.nav} aria-label="Primary">
          <a className={styles.navLink} href="#discover">
            Discover
          </a>
          <a className={styles.navLink} href="#topics">
            Topics
          </a>
          <button
            type="button"
            className={styles.navLink}
            onClick={() => setPickOpen((open) => !open)}
          >
            Daily Pick
          </button>
        </nav>

        <DailyPick
          book={dailyPick}
          open={pickOpen}
          onToggle={setPickOpen}
          onOpenBook={onOpenBook}
        />
      </div>
    </header>
  );
}
