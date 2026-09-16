import type { SortId, SortOption } from '../lib/types';
import styles from './SortControl.module.css';

export const SORT_OPTIONS: SortOption[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'recent', label: 'Recently Added' },
  { id: 'title', label: 'Title A–Z' },
  { id: 'random', label: 'Random Discovery' },
];

interface SortControlProps {
  value: SortId;
  onChange: (value: SortId) => void;
  /** Re-seeds Random Discovery without changing the sort. */
  onReshuffle: () => void;
}

export function SortControl({ value, onChange, onReshuffle }: SortControlProps) {
  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor="catalog-sort">
        Sort
      </label>
      <span className={styles.selectWrap}>
        <select
          id="catalog-sort"
          className={styles.select}
          value={value}
          onChange={(event) => onChange(event.target.value as SortId)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className={styles.chevron}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {value === 'random' ? (
        <button type="button" className={styles.shuffle} onClick={onReshuffle}>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M1.5 4h3l6 8h3" strokeLinecap="round" />
            <path d="M1.5 12h3l2.2-3" strokeLinecap="round" />
            <path d="M11.5 1.8 13.8 4l-2.3 2.2M11.5 9.8 13.8 12l-2.3 2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Shuffle again
        </button>
      ) : null}
    </div>
  );
}
