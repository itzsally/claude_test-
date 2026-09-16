import type { Genre, GenreId } from '../lib/types';

/**
 * The twelve shelves of the library. Each carries a palette of cloth bindings
 * that its spines and covers are bound in — muted, slightly faded, the colours
 * of a wall of well-kept older books.
 */
export const GENRES: Genre[] = [
  {
    id: 'literary-fiction',
    label: 'Literary Fiction',
    blurb: 'Close attention paid to ordinary lives.',
    palette: {
      bindings: ['#8f5a4f', '#a8705c', '#6e4a42', '#b08268', '#7c5344'],
      ink: '#f6ecdb',
      foil: '#c9a34e',
    },
  },
  {
    id: 'classics',
    label: 'Classics',
    blurb: 'Books that have outlived every argument about them.',
    palette: {
      bindings: ['#6d2f2a', '#8a3b31', '#55231f', '#9c5b3e', '#7b3a2c'],
      ink: '#f4e9d6',
      foil: '#d4b062',
    },
  },
  {
    id: 'history',
    label: 'History',
    blurb: 'How we arrived at the present, slowly.',
    palette: {
      bindings: ['#3f5340', '#556b45', '#2f4236', '#6b7c52', '#47593c'],
      ink: '#f2ecd9',
      foil: '#c8a75a',
    },
  },
  {
    id: 'science',
    label: 'Science',
    blurb: 'Patient looking, carefully written down.',
    palette: {
      bindings: ['#3c5566', '#4a6b78', '#2c414f', '#5d7f88', '#37505c'],
      ink: '#eef2ef',
      foil: '#bfa765',
    },
  },
  {
    id: 'science-fiction',
    label: 'Science Fiction',
    blurb: 'The present, viewed from an unfamiliar angle.',
    palette: {
      bindings: ['#3a3a5e', '#4b3f6b', '#2a2a46', '#5a4a72', '#333a58'],
      ink: '#eeeaf4',
      foil: '#c6a961',
    },
  },
  {
    id: 'philosophy',
    label: 'Philosophy',
    blurb: 'Questions that refuse to be settled.',
    palette: {
      bindings: ['#4a463f', '#5f5a4e', '#35322c', '#6e6455', '#413d36'],
      ink: '#f3eee1',
      foil: '#cbb173',
    },
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    blurb: 'Invented worlds with real weather.',
    palette: {
      bindings: ['#2f5350', '#3d6b63', '#234340', '#453a5c', '#35605a'],
      ink: '#f0ece0',
      foil: '#d2b166',
    },
  },
  {
    id: 'mystery',
    label: 'Mystery',
    blurb: 'Small towns, long memories, loose ends.',
    palette: {
      bindings: ['#2b2f38', '#39414d', '#1f232a', '#4a5260', '#2f3a42'],
      ink: '#ece9e2',
      foil: '#bda162',
    },
  },
  {
    id: 'biography',
    label: 'Biography',
    blurb: 'One life, followed all the way through.',
    palette: {
      bindings: ['#9a6f3f', '#b08343', '#7d5730', '#c09a5e', '#8a6435'],
      ink: '#fbf3e2',
      foil: '#5d4524',
    },
  },
  {
    id: 'poetry',
    label: 'Poetry',
    blurb: 'Language asked to carry more than usual.',
    palette: {
      bindings: ['#8c9478', '#a3a98c', '#6f7a63', '#b5ad9a', '#97917f'],
      ink: '#2b2a24',
      foil: '#6a5b33',
    },
  },
  {
    id: 'psychology',
    label: 'Psychology',
    blurb: 'Why people do the things they keep doing.',
    palette: {
      bindings: ['#a35a44', '#b96f4d', '#874634', '#c58a63', '#94523c'],
      ink: '#fbf0e2',
      foil: '#e0c07d',
    },
  },
  {
    id: 'self-discovery',
    label: 'Self-Discovery',
    blurb: 'Quiet books about paying attention.',
    palette: {
      bindings: ['#c3a273', '#d3b98e', '#ad8b5e', '#e0cba4', '#b99a6c'],
      ink: '#3a2f22',
      foil: '#7a6132',
    },
  },
];

export const GENRE_BY_ID: Record<GenreId, Genre> = Object.fromEntries(
  GENRES.map((genre) => [genre.id, genre]),
) as Record<GenreId, Genre>;

export function genreLabel(id: GenreId): string {
  return GENRE_BY_ID[id]?.label ?? 'Uncatalogued';
}
