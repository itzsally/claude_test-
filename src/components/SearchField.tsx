import type { FormEvent } from 'react';
import styles from './SearchField.module.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Called on submit — used to bring the catalog into view. */
  onSubmit: () => void;
  /** Id of the region this field filters, for assistive technology. */
  controls: string;
}

export function SearchField({ value, onChange, onSubmit, controls }: SearchFieldProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className={styles.form} role="search" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="library-search">
        Search the library by title, author, or genre
      </label>
      <div className={styles.field}>
        <svg
          className={styles.icon}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="8.6" cy="8.6" r="5.6" />
          <line x1="12.8" y1="12.8" x2="17.4" y2="17.4" strokeLinecap="round" />
        </svg>

        <input
          id="library-search"
          className={styles.input}
          type="search"
          autoComplete="off"
          placeholder="Search by title, author, or genre…"
          value={value}
          aria-controls={controls}
          onChange={(event) => onChange(event.target.value)}
        />

        {value ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onClick={() => onChange('')}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14" aria-hidden="true">
              <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" strokeLinecap="round" />
              <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}

        <button type="submit" className={styles.submit}>
          Search
        </button>
      </div>
    </form>
  );
}
