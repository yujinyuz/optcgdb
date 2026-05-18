import { create } from 'zustand';
import { initDB, queryCards, queryPacks, querySets, queryBlocks } from './db';
import type { Card, Pack, CardFilters } from './types';
import { DEFAULT_FILTERS } from './types';

type Theme = 'light' | 'dark';
type PreferredLanguage = 'english' | 'japanese';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('optcg-theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialLanguage(): PreferredLanguage {
  if (typeof window === 'undefined') return 'english';
  const stored = localStorage.getItem('optcg-language') as PreferredLanguage | null;
  if (stored === 'english' || stored === 'japanese') return stored;
  return 'english';
}

/* ── URL sync helpers ─────────────────────────────────────────── */

function filtersToParams(filters: CardFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.search) p.set('q', filters.search);
  if (filters.colors.length) p.set('colors', filters.colors.join(','));
  if (filters.categories.length) p.set('categories', filters.categories.join(','));
  if (filters.rarities.length) p.set('rarities', filters.rarities.join(','));
  if (filters.attributes.length) p.set('attributes', filters.attributes.join(','));
  if (filters.setPrefix) p.set('set', filters.setPrefix);
  if (filters.costMin != null) p.set('costMin', String(filters.costMin));
  if (filters.costMax != null) p.set('costMax', String(filters.costMax));
  if (filters.powerMin != null) p.set('powerMin', String(filters.powerMin));
  if (filters.powerMax != null) p.set('powerMax', String(filters.powerMax));
  if (filters.counterMin != null) p.set('counterMin', String(filters.counterMin));
  if (filters.counterMax != null) p.set('counterMax', String(filters.counterMax));
  if (filters.blocks.length) p.set('blocks', filters.blocks.join(','));
  return p;
}

function paramsToFilters(params: URLSearchParams): Partial<CardFilters> {
  const f: Partial<CardFilters> = {};
  if (params.has('q')) f.search = params.get('q')!;
  if (params.has('colors')) f.colors = params.get('colors')!.split(',');
  if (params.has('categories')) f.categories = params.get('categories')!.split(',') as CardFilters['categories'];
  if (params.has('rarities')) f.rarities = params.get('rarities')!.split(',') as CardFilters['rarities'];
  if (params.has('attributes')) f.attributes = params.get('attributes')!.split(',') as CardFilters['attributes'];
  if (params.has('set')) f.setPrefix = params.get('set');
  if (params.has('costMin')) f.costMin = Number(params.get('costMin'));
  if (params.has('costMax')) f.costMax = Number(params.get('costMax'));
  if (params.has('powerMin')) f.powerMin = Number(params.get('powerMin'));
  if (params.has('powerMax')) f.powerMax = Number(params.get('powerMax'));
  if (params.has('counterMin')) f.counterMin = Number(params.get('counterMin'));
  if (params.has('counterMax')) f.counterMax = Number(params.get('counterMax'));
  if (params.has('blocks')) f.blocks = params.get('blocks')!.split(',').map(Number);
  return f;
}

function readUrlFilters(): CardFilters {
  if (typeof window === 'undefined') return { ...DEFAULT_FILTERS };
  return { ...DEFAULT_FILTERS, ...paramsToFilters(new URLSearchParams(window.location.search)) };
}

function writeUrlFilters(filters: CardFilters) {
  if (typeof window === 'undefined') return;
  const params = filtersToParams(filters);
  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', newUrl);
}

/* ── Store ────────────────────────────────────────────────────── */

interface AppState {
  loading: boolean;
  error: string | null;
  cards: Card[];
  totalCards: number;
  packs: Pack[];
  sets: string[];
  blocks: number[];
  filters: CardFilters;
  limit: number;
  offset: number;
  hasMore: boolean;
  selectedCard: Card | null;
  theme: Theme;
  preferredLanguage: PreferredLanguage;
  offlineReady: boolean;
  showOfflineToast: boolean;
  searching: boolean;

  init: () => Promise<void>;
  setFilters: (filters: Partial<CardFilters>) => void;
  resetFilters: () => void;
  loadMore: () => Promise<void>;
  setSelectedCard: (card: Card | null) => void;
  toggleTheme: () => void;
  setPreferredLanguage: (lang: PreferredLanguage) => void;
  setOfflineReady: (ready: boolean) => void;
  triggerOfflineToast: () => void;
  dismissOfflineToast: () => void;
  search: (append?: boolean) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  loading: true,
  error: null,
  cards: [],
  totalCards: 0,
  packs: [],
  sets: [],
  blocks: [],
  filters: readUrlFilters(),
  limit: 50,
  offset: 0,
  hasMore: false,
  selectedCard: null,
  theme: getInitialTheme(),
  preferredLanguage: getInitialLanguage(),
  offlineReady: false,
  showOfflineToast: false,
  searching: false,

  init: async () => {
    try {
      set({ loading: true, error: null });
      await initDB();
      const [packs, sets, blocks] = await Promise.all([
        queryPacks(),
        querySets(),
        queryBlocks(),
      ]);
      set({ packs, sets, blocks, loading: false });

      const theme = get().theme;
      document.documentElement.classList.toggle('dark', theme === 'dark');

      await get().search();
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  setFilters: (filters) => {
    const newFilters = { ...get().filters, ...filters };
    writeUrlFilters(newFilters);
    set({ filters: newFilters, offset: 0, hasMore: false });
    get().search();
  },

  resetFilters: () => {
    writeUrlFilters(DEFAULT_FILTERS);
    set({ filters: { ...DEFAULT_FILTERS }, offset: 0, hasMore: false });
    get().search();
  },

  loadMore: async () => {
    const { offset, limit, totalCards, cards, filters, searching, preferredLanguage } = get();
    if (searching || cards.length >= totalCards) return;

    const newOffset = offset + limit;
    set({ offset: newOffset, searching: true });

      try {
        const { cards: moreCards, total } = await queryCards({
          search: filters.search || undefined,
          colors: filters.colors.length ? filters.colors : undefined,
          categories: filters.categories.length ? filters.categories : undefined,
          rarities: filters.rarities.length ? filters.rarities : undefined,
          attributes: filters.attributes.length ? filters.attributes : undefined,
          costMin: filters.costMin,
          costMax: filters.costMax,
          powerMin: filters.powerMin,
          powerMax: filters.powerMax,
          counterMin: filters.counterMin,
          counterMax: filters.counterMax,
          setPrefix: filters.setPrefix || undefined,
          blocks: filters.blocks.length ? filters.blocks : undefined,
          preferredLanguage,
          limit,
          offset: newOffset,
        });
      set({
        cards: [...cards, ...moreCards],
        totalCards: total,
        hasMore: newOffset + moreCards.length < total,
        searching: false,
      });
    } catch (err) {
      set({ searching: false });
      console.error('Load more failed:', err);
    }
  },

  setSelectedCard: (card) => set({ selectedCard: card }),

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('optcg-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return { theme: newTheme };
    });
  },

  setPreferredLanguage: (lang) => {
    localStorage.setItem('optcg-language', lang);
    set({ preferredLanguage: lang });
    get().search();
  },

  setOfflineReady: (ready) => {
    set({ offlineReady: ready, showOfflineToast: ready });
  },

  triggerOfflineToast: () => {
    set({ showOfflineToast: true });
  },

  dismissOfflineToast: () => {
    set({ showOfflineToast: false });
  },

  search: async (append = false) => {
    const { filters, limit, offset, preferredLanguage } = get();
    set({ searching: true });
      try {
        const { cards, total } = await queryCards({
          search: filters.search || undefined,
          colors: filters.colors.length ? filters.colors : undefined,
          categories: filters.categories.length ? filters.categories : undefined,
          rarities: filters.rarities.length ? filters.rarities : undefined,
          attributes: filters.attributes.length ? filters.attributes : undefined,
          costMin: filters.costMin,
          costMax: filters.costMax,
          powerMin: filters.powerMin,
          powerMax: filters.powerMax,
          counterMin: filters.counterMin,
          counterMax: filters.counterMax,
          setPrefix: filters.setPrefix || undefined,
          blocks: filters.blocks.length ? filters.blocks : undefined,
          preferredLanguage,
          limit,
          offset,
        });
      set({
        cards: append ? [...get().cards, ...cards] : cards,
        totalCards: total,
        hasMore: offset + cards.length < total,
        searching: false,
      });
    } catch (err) {
      set({ searching: false });
      console.error('Search failed:', err);
    }
  },
}));