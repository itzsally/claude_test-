import { useCallback, useId, useState } from 'react';
import { Catalog } from './components/Catalog';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { BookDialog } from './components/BookDialog';
import { useDailyPick } from './hooks/useDailyPick';
import { useLibrary } from './hooks/useLibrary';
import type { Book } from './lib/types';

export default function App() {
  const library = useLibrary();
  const dailyPick = useDailyPick(library.books);
  const [openBook, setOpenBook] = useState<Book | null>(null);
  const catalogId = useId();

  const closeBook = useCallback(() => setOpenBook(null), []);

  const scrollToCatalog = useCallback(() => {
    document.getElementById('discover')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <>
      <a className="skip-link" href="#discover">
        Skip to the catalogue
      </a>

      <Header dailyPick={dailyPick} onOpenBook={setOpenBook} />

      <main>
        <Hero
          featured={library.featured}
          query={library.query}
          onQueryChange={library.setQuery}
          onSubmitSearch={scrollToCatalog}
          resultCount={library.status === 'ready' ? library.results.length : null}
          catalogId={catalogId}
          onOpenBook={setOpenBook}
        />

        <Catalog library={library} id={catalogId} onOpenBook={setOpenBook} />
      </main>

      <Footer />

      <BookDialog book={openBook} onClose={closeBook} />
    </>
  );
}
