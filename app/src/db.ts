import type { Card, Pack } from './types';

type WorkerResponse = {
  type: 'init-done' | 'result' | 'error';
  id: string;
  data?: unknown;
  error?: string;
};

export type QueryCardsFilters = {
  search?: string;
  colors?: string[];
  categories?: string[];
  rarities?: string[];
  attributes?: string[];
  costMin?: number | null;
  costMax?: number | null;
  powerMin?: number | null;
  powerMax?: number | null;
  counterMin?: number | null;
  counterMax?: number | null;
  setPrefix?: string | null;
  blocks?: number[];
  hideParallels?: boolean;
  preferredLanguage?: 'english' | 'japanese';
  limit?: number;
  offset?: number;
};

let worker: Worker | null = null;
const pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();
let requestId = 0;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./workers/db.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const { type, id, data, error } = e.data;
    const pending = pendingRequests.get(id);
    if (!pending) return;
    pendingRequests.delete(id);

    if (type === 'error' || error) {
      pending.reject(new Error(error || 'Unknown worker error'));
    } else {
      pending.resolve(data);
    }
  };
  return worker;
}

function sendRequest<T>(type: string, payload?: unknown): Promise<T> {
  const id = String(++requestId);
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });
    w.postMessage({ type, id, payload });
  });
}

export async function initDB(): Promise<void> {
  await sendRequest<void>('init');
}

export async function queryCards(filters: QueryCardsFilters): Promise<{ cards: Card[]; total: number }> {
  const result = await sendRequest<{ cards: Card[]; total: number }>('queryCards', filters);
  return result;
}

export async function queryPacks(): Promise<Pack[]> {
  const result = await sendRequest<Pack[]>('queryPacks');
  return result;
}

export async function querySets(): Promise<string[]> {
  const result = await sendRequest<string[]>('querySets');
  return result;
}

export async function queryBlocks(): Promise<number[]> {
  const result = await sendRequest<number[]>('queryBlocks');
  return result;
}

export async function getCardById(id: string): Promise<Card | null> {
  const result = await sendRequest<Card | null>('getCardById', { id });
  return result;
}

export async function getCardPacks(cardId: string): Promise<{ packId: string; label: string; rawTitle: string; language: string }[]> {
  const result = await sendRequest<{ packId: string; label: string; rawTitle: string; language: string }[]>('getCardPacks', { cardId });
  return result;
}

export async function getCardImages(cardId: string): Promise<{ language: string; imgUrl: string | null }[]> {
  const result = await sendRequest<{ language: string; imgUrl: string | null }[]>('getCardImages', { cardId });
  return result;
}

export async function getRelatedCards(cardId: string, types: string[], limit?: number): Promise<Card[]> {
  const result = await sendRequest<Card[]>('getRelatedCards', { cardId, types, limit });
  return result;
}

export async function getCardVariants(cardId: string): Promise<{ card: Card; images: { language: string; imgUrl: string | null }[] }[]> {
  const result = await sendRequest<{ card: Card; images: { language: string; imgUrl: string | null }[] }[]>('getCardVariants', { cardId });
  return result;
}