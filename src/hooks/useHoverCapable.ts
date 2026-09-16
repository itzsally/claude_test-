import { useEffect, useState } from 'react';

/**
 * True when the device has a real pointer that can hover. Used to decide
 * whether the shelf reveals a book on hover or on tap — the same interaction
 * has to work both ways without one breaking the other.
 */
export function useHoverCapable(): boolean {
  const [hoverCapable, setHoverCapable] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(hover: hover)');
    const update = () => setHoverCapable(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return hoverCapable;
}
