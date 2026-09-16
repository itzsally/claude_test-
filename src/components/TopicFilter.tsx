import { GENRES } from '../data/genres';
import type { GenreId } from '../lib/types';
import styles from './TopicFilter.module.css';

interface TopicFilterProps {
  selected: GenreId | 'all';
  counts: Map<GenreId, number>;
  totalCount: number;
  onSelect: (genre: GenreId | 'all') => void;
}

/**
 * Topic chips. Rendered as a single-select group of toggle buttons rather than
 * links, so the catalog filters instantly without a navigation.
 */
export function TopicFilter({ selected, counts, totalCount, onSelect }: TopicFilterProps) {
  const options: Array<{ id: GenreId | 'all'; label: string; count: number }> = [
    { id: 'all', label: 'Everything', count: totalCount },
    ...GENRES.map((genre) => ({
      id: genre.id,
      label: genre.label,
      count: counts.get(genre.id) ?? 0,
    })),
  ];

  return (
    <ul className={styles.list} id="topics">
      {options.map((option) => {
        const isSelected = option.id === selected;
        return (
          <li key={option.id}>
            <button
              type="button"
              className={`${styles.chip} ${isSelected ? styles.selected : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(option.id)}
            >
              {option.label}
              <span className={styles.count}>{option.count.toLocaleString()}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
