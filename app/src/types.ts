export interface Pack {
  id: string;
  language: string;
  prefix: string;
  title: string;
  label: string;
  raw_title: string;
}

export interface Card {
  id: string;
  name: string;
  rarity: string;
  category: string;
  cost: number | null;
  power: number | null;
  counter: number | null;
  effect: string | null;
  trigger_text: string | null;
  colors: string[];
  attributes: string[];
  types: string[];
  block_number: number | null;
}

export type CardCategory = 'Leader' | 'Character' | 'Event' | 'Stage' | 'Don';
export type CardColor = 'Red' | 'Blue' | 'Green' | 'Purple' | 'Black' | 'Yellow';
export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'SuperRare' | 'SecretRare' | 'Leader' | 'Special' | 'TreasureRare' | 'Promo';

export interface CardFilters {
  search: string;
  colors: string[];
  categories: string[];
  rarities: string[];
  attributes: string[];
  costMin: number | null;
  costMax: number | null;
  powerMin: number | null;
  powerMax: number | null;
  setPrefix: string | null;
  blocks: number[];
}

export const DEFAULT_FILTERS: CardFilters = {
  search: '',
  colors: [],
  categories: [],
  rarities: [],
  attributes: [],
  costMin: null,
  costMax: null,
  powerMin: null,
  powerMax: null,
  setPrefix: null,
  blocks: [],
};

export const ALL_COLORS: CardColor[] = ['Red', 'Blue', 'Green', 'Purple', 'Black', 'Yellow'];
export const ALL_CATEGORIES: CardCategory[] = ['Leader', 'Character', 'Event', 'Stage', 'Don'];
export const ALL_RARITIES: CardRarity[] = ['Common', 'Uncommon', 'Rare', 'SuperRare', 'SecretRare', 'Leader', 'Special', 'TreasureRare', 'Promo'];
export const ALL_ATTRIBUTES = ['Strike', 'Slash', 'Ranged', 'Wisdom', 'Special'] as const;

export const RARITY_SHORT: Record<string, string> = {
  Common: 'C',
  Uncommon: 'UC',
  Rare: 'R',
  SuperRare: 'SR',
  SecretRare: 'SEC',
  Leader: 'L',
  Special: 'SP',
  TreasureRare: 'TR',
  Promo: 'P',
};

export const COLOR_HEX: Record<string, string> = {
  Red: '#e74c3c',
  Blue: '#3498db',
  Green: '#2ecc71',
  Purple: '#9b59b6',
  Black: '#2c3e50',
  Yellow: '#f1c40f',
};