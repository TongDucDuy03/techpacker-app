import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'techpacker:seasonSuggestions';

export const DEFAULT_SEASONS = [
  'Spring',
  'Summer',
  'Autumn',
  'Winter',
  'SS25',
  'FW25',
  'SS26',
  'FW26',
];

const mergeUnique = (values: string[]) => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(normalized);
  });
  return ordered;
};

export const useSeasonSuggestions = () => {
  const [seasonSuggestions, setSeasonSuggestions] = useState<string[]>(DEFAULT_SEASONS);
  const hasHydrated = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSeasonSuggestions((prev) => mergeUnique([...prev, ...parsed]));
        }
      }
    } catch {
      // Ignore storage parsing errors silently
    } finally {
      hasHydrated.current = true;
    }
  }, []);

  // Persist whenever suggestions change (after hydration)
  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seasonSuggestions));
    } catch {
      // Storage might be unavailable (private mode, etc.) — swallow
    }
  }, [seasonSuggestions]);

  const addSeasonSuggestion = useCallback((season?: string | null) => {
    if (!season) return;
    const normalized = season.trim();
    if (!normalized) return;
    setSeasonSuggestions((prev) => {
      if (prev.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }
      return [...prev, normalized];
    });
  }, []);

  const sortedSuggestions = mergeUnique(seasonSuggestions).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  return {
    seasonSuggestions: sortedSuggestions,
    addSeasonSuggestion,
  };
};


