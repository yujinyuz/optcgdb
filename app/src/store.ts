import { create } from 'zustand';
import { initDB, queryCards, queryPacks, querySets, queryBlocks } from './db';
import type { QueryCardsFilters } from './db';
import type { Card, Pack, CardFilters, SearchScope } from './types';
import { DEFAULT_FILTERS, SEARCH_LANGUAGES, SEARCH_LANGUAGE_DISPLAY } from './types';

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

let searchUrlSyncTimer: ReturnType<typeof setTimeout> | null = null;


function filtersToParams(filters: CardFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.search) p.set('q', filters.search);
  if (filters.searchScopes.length) p.set('scope', filters.searchScopes.join(','));
  if (filters.colors.length) p.set('colors', filters.colors.join(','));
  if (filters.categories.length) p.set('categories', filters.categories.join(','));
  if (filters.rarities.length) p.set('rarities', filters.rarities.join(','));
  if (filters.attributes.length) p.set('attributes', filters.attributes.join(','));
  if (filters.sets.length) p.set('set', filters.sets.join(','));
  if (filters.costMin != null) p.set('costMin', String(filters.costMin));
  if (filters.costMax != null) p.set('costMax', String(filters.costMax));
  if (filters.powerMin != null) p.set('powerMin', String(filters.powerMin));
  if (filters.powerMax != null) p.set('powerMax', String(filters.powerMax));
  if (filters.counterMin != null) p.set('counterMin', String(filters.counterMin));
  if (filters.counterMax != null) p.set('counterMax', String(filters.counterMax));
  if (filters.blocks.length) p.set('blocks', filters.blocks.join(','));
  return p;
}

function safeNum(val: string | null): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
}

function paramsToFilters(params: URLSearchParams): Partial<CardFilters> {
  const f: Partial<CardFilters> = {};
  if (params.has('q')) f.search = params.get('q')!;
  const scopes = params.get('scope');
  if (scopes) {
    const valid = scopes.split(',').filter((s) => s === 'name' || s === 'effect' || s === 'trigger') as SearchScope[];
    if (valid.length) f.searchScopes = valid;
  }
  if (params.has('colors')) f.colors = params.get('colors')!.split(',');
  if (params.has('categories')) f.categories = params.get('categories')!.split(',') as CardFilters['categories'];
  if (params.has('rarities')) f.rarities = params.get('rarities')!.split(',') as CardFilters['rarities'];
  if (params.has('attributes')) f.attributes = params.get('attributes')!.split(',') as CardFilters['attributes'];
  if (params.has('set')) f.sets = params.get('set')!.split(',');
  if (params.has('costMin')) f.costMin = safeNum(params.get('costMin'));
  if (params.has('costMax')) f.costMax = safeNum(params.get('costMax'));
  if (params.has('powerMin')) f.powerMin = safeNum(params.get('powerMin'));
  if (params.has('powerMax')) f.powerMax = safeNum(params.get('powerMax'));
  if (params.has('counterMin')) f.counterMin = safeNum(params.get('counterMin'));
  if (params.has('counterMax')) f.counterMax = safeNum(params.get('counterMax'));
  if (params.has('blocks')) f.blocks = params.get('blocks')!.split(',').map(Number).filter((n) => !Number.isNaN(n));
  return f;
}

function readUrlFilters(): CardFilters {
  if (typeof window === 'undefined') return { ...DEFAULT_FILTERS };
  return { ...DEFAULT_FILTERS, ...paramsToFilters(new URLSearchParams(window.location.search)) };
}

function writeUrlFilters(filters: CardFilters) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/') return;
  const params = filtersToParams(filters);
  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', newUrl);
}

/* ── Query params builder ───────────────────────────────────── */

function buildQueryParams(
  filters: CardFilters,
  limit: number,
  offset: number,
  preferredLanguage: PreferredLanguage,
  showAlternateArts: boolean,
  loadExternalImages: boolean,
): QueryCardsFilters {
  return {
    search: filters.search || undefined,
    searchScope: filters.searchScopes.length ? filters.searchScopes : undefined,
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
    sets: filters.sets.length ? filters.sets : undefined,
    blocks: filters.blocks.length ? filters.blocks : undefined,
    preferredLanguage,
    hideVariants: !loadExternalImages || !showAlternateArts,
    limit,
    offset,
  };
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
  searchInput: string;
  limit: number;
  offset: number;
  hasMore: boolean;
  selectedCard: Card | null;
  theme: Theme;
  preferredLanguage: PreferredLanguage;
  loadExternalImages: boolean;
  showAlternateArts: boolean;
  offlineReady: boolean;
  showOfflineToast: boolean;
  searching: boolean;
  searchLoading: boolean;

  init: () => Promise<void>;
  setFilters: (filters: Partial<CardFilters>) => void;
  setSearchInput: (value: string) => void;
  setSearchFilter: (value: string) => void;
  setSearchScope: (scope: SearchScope) => void;
  resetFilters: () => void;
  loadMore: () => Promise<void>;
  setSelectedCard: (card: Card | null) => void;
  setSelectedCardWithTransition: (card: Card) => void;
  toggleTheme: () => void;
  setPreferredLanguage: (lang: PreferredLanguage) => void;
  setLoadExternalImages: (enabled: boolean) => void;
  setShowAlternateArts: (enabled: boolean) => void;
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
  searchInput: readUrlFilters().search,
  limit: 50,
  offset: 0,
  hasMore: false,
  selectedCard: null,
  theme: getInitialTheme(),
  preferredLanguage: getInitialLanguage(),
  loadExternalImages: localStorage.getItem('optcg-external-images') === 'true',
  showAlternateArts: localStorage.getItem('optcg-show-alternate-arts') === 'true',
  offlineReady: false,
  showOfflineToast: false,
  searching: false,
  searchLoading: false,

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

      set({ searching: true });
      await get().search();
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  setFilters: (filters) => {
    const newFilters = { ...get().filters, ...filters };
    writeUrlFilters(newFilters);
    set({ filters: newFilters, offset: 0, hasMore: false, searching: true, ...(filters.search !== undefined ? { searchInput: filters.search } : {}) });
    get().search();
  },

  setSearchInput: (value) => {
    set({ searchInput: value })
    if (searchUrlSyncTimer) clearTimeout(searchUrlSyncTimer)
    searchUrlSyncTimer = setTimeout(() => {
      const { filters } = useAppStore.getState()
      writeUrlFilters({ ...filters, search: value })
    }, 1000)
  },

  setSearchFilter: (value) => {
    const newFilters = { ...get().filters, search: value }
    set({ filters: newFilters, offset: 0, hasMore: false })
    get().search()
  },

  setSearchScope: (scope) => {
    const current = get().filters.searchScopes;
    const next = current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope];
    const newFilters = { ...get().filters, searchScopes: next };
    writeUrlFilters(newFilters);
    set({ filters: newFilters });
    get().search();
  },

  resetFilters: () => {
    writeUrlFilters(DEFAULT_FILTERS);
    set({ filters: { ...DEFAULT_FILTERS }, searchInput: '', offset: 0, hasMore: false });
    get().search();
  },

  loadMore: async () => {
    const { offset, limit, totalCards, cards, filters, searching, preferredLanguage, showAlternateArts, loadExternalImages } = get();
    if (searching || cards.length >= totalCards) return;

    const newOffset = offset + limit;
    set({ offset: newOffset, searching: true });

    try {
      const { cards: moreCards, total } = await queryCards(
        buildQueryParams(filters, limit, newOffset, preferredLanguage, showAlternateArts, loadExternalImages)
      );
      set({
        cards: [...cards, ...moreCards],
        totalCards: total,
        hasMore: newOffset + moreCards.length < total,
        searching: false,
      });
    } catch (err) {
      set({ searching: false, error: String(err) });
    }
  },

  setSelectedCard: (card) => set({ selectedCard: card }),

  setSelectedCardWithTransition: (card) => {
    // View Transition name is set by the caller (CardGrid) on the tile element.
    // The modal reads it via the same CSS name. Just set the card.
    set({ selectedCard: card })
  },

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

  setLoadExternalImages: (enabled) => {
    localStorage.setItem('optcg-external-images', String(enabled));
    if (enabled) {
      localStorage.setItem('optcg-show-alternate-arts', 'true');
      set({ loadExternalImages: enabled, showAlternateArts: true });
    } else {
      set({ loadExternalImages: enabled });
    }
    get().search();
  },

  setShowAlternateArts: (enabled) => {
    localStorage.setItem('optcg-show-alternate-arts', String(enabled));
    set({ showAlternateArts: enabled });
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
    const { filters, limit, offset, preferredLanguage, showAlternateArts, loadExternalImages } = get();
    set({ searchLoading: true });
    try {
      const { cards, total } = await queryCards(
        buildQueryParams(filters, limit, offset, preferredLanguage, showAlternateArts, loadExternalImages)
      );
      set({
        cards: append ? [...get().cards, ...cards] : cards,
        totalCards: total,
        hasMore: offset + cards.length < total,
        searchLoading: false,
        searching: false,
      });
    } catch (err) {
      set({ searchLoading: false, searching: false, error: String(err) });
    }
  },
}));

/* ── Language section grouping (search only) ────────────────── */

export interface LanguageSection {
  lang: string;
  title: string;
  cards: Card[];
}

export function getLanguageSections(): LanguageSection[] {
  const { cards, filters } = useAppStore.getState();
  if (!filters.search) return [];

  return SEARCH_LANGUAGES
    .map((lang) => ({
      lang,
      title: SEARCH_LANGUAGES.includes(lang as typeof SEARCH_LANGUAGES[number])
        ? (SEARCH_LANGUAGE_DISPLAY as Record<string, string>)[lang] || lang
        : lang,
      cards: cards.filter((c) => {
        if (!c.has_images?.[lang]) return false;
        if (lang === 'english') return true;
        return !!c.name_translated;
      }),
    }))
    .filter((s) => s.cards.length > 0);
}