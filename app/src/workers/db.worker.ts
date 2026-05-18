import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

let db: Database | null = null;

export type WorkerMessage =
  | { type: 'init' }
  | { type: 'queryCards'; filters: QueryCardsFilters }
  | { type: 'queryPacks' }
  | { type: 'querySets' }
  | { type: 'queryBlocks' }
  | { type: 'getCardById'; id: string }
  | { type: 'getCardPacks'; cardId: string }
  | { type: 'getCardImages'; cardId: string }
  | { type: 'getRelatedCards'; cardId: string; types: string[]; limit?: number }
  | { type: 'getCardVariants'; cardId: string };

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
  setPrefix?: string | null;
  blocks?: number[];
  limit?: number;
  offset?: number;
};

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ── Query Builder ─────────────────────────────────────────────── */

class QueryBuilder {
  private ctes: Array<{ sql: string; params: (string | number | null)[] }> = [];
  private joins: string[] = [];
  private conditions: Array<{ sql: string; params: (string | number | null)[] }> = [];
  private orderCols = 'c.id';

  private allParams(): (string | number | null)[] {
    const cteParams = this.ctes.flatMap((c) => c.params);
    const conditionParams = this.conditions.flatMap((c) => c.params);
    return [...cteParams, ...conditionParams];
  }

  withCte(name: string, sql: string, ...params: (string | number | null)[]) {
    this.ctes.push({ sql: `${name} AS (${sql})`, params });
    return this;
  }

  join(tableExpr: string) {
    this.joins.push(`JOIN ${tableExpr}`);
    return this;
  }

  where(sql: string, ...params: (string | number | null)[]) {
    this.conditions.push({ sql, params });
    return this;
  }

  orderBy(cols: string) {
    this.orderCols = cols;
    return this;
  }

  private cteSql() {
    return this.ctes.length ? `WITH ${this.ctes.map((c) => c.sql).join(', ')} ` : '';
  }

  private joinSql() {
    return this.joins.join(' ');
  }

  private whereSql() {
    const sqls = this.conditions.map((c) => c.sql);
    return sqls.length ? `WHERE ${sqls.join(' AND ')}` : '';
  }

  dedup(table: string, groupByExpr: string) {
    const subqueryConditions = this.conditions.map((c) => c.sql.replace(/\bc\./g, 'c2.'));
    const subqueryParams = this.conditions.flatMap((c) => c.params);
    const whereSql = subqueryConditions.length ? `WHERE ${subqueryConditions.join(' AND ')}` : '';
    const groupSql = groupByExpr.replace(/\bc\./g, 'c2.');
    const dedupSql = `c.id IN (SELECT MIN(c2.id) FROM ${table} c2 ${whereSql} GROUP BY ${groupSql})`;
    this.conditions.push({ sql: dedupSql, params: subqueryParams });
    return this;
  }

  count(from: string): { sql: string; params: (string | number | null)[] } {
    const sql = `${this.cteSql()}SELECT COUNT(*) as total FROM ${from} ${this.joinSql()} ${this.whereSql()}`.trim();
    return { sql, params: this.allParams() };
  }

  select(cols: string, from: string, limit?: number, offset?: number): { sql: string; params: (string | number | null)[] } {
    let sql = `${this.cteSql()}SELECT ${cols} FROM ${from} ${this.joinSql()} ${this.whereSql()}`.trim();
    sql += ` ORDER BY ${this.orderCols}`;
    const finalParams = [...this.allParams()];
    if (limit !== undefined) { sql += ' LIMIT ?'; finalParams.push(limit); }
    if (offset !== undefined) { sql += ' OFFSET ?'; finalParams.push(offset); }
    return { sql, params: finalParams };
  }
}

function buildCardColumns(): string {
  return `c.id, c.name, c.rarity, c.category, c.cost, c.power, c.counter,
          c.effect, c.trigger_text, c.block_number,
          c.colors_json, c.attributes_json, c.types_json`;
}

function rowToCard(row: (string | number | null)[]): Record<string, unknown> {
  return {
    id: row[0], name: row[1], rarity: row[2], category: row[3],
    cost: row[4], power: row[5], counter: row[6],
    effect: row[7], trigger_text: row[8], block_number: row[9],
    colors: parseJsonArray(row[10] as string | null),
    attributes: parseJsonArray(row[11] as string | null),
    types: parseJsonArray(row[12] as string | null),
  };
}

function queryCards(db: Database, filters: QueryCardsFilters): { cards: unknown[]; total: number } {
  const q = new QueryBuilder();

  if (filters.search) {
    const raw = filters.search.trim();
    const ftsQuery = raw.split(/\s+/).map((w) => (w.endsWith('*') ? w : `${w}*`)).join(' ');
    q.withCte(
      '_search_ids',
      `SELECT card_id as id FROM cards_fts WHERE search_text MATCH ? UNION SELECT id FROM cards WHERE id LIKE ?`,
      ftsQuery,
      `%${raw}%`
    );
    q.join('_search_ids _s ON c.id = _s.id');
  }

  if (filters.categories?.length) {
    q.where(`c.category IN (${placeholders(filters.categories.length)})`, ...filters.categories);
  }
  if (filters.rarities?.length) {
    q.where(`c.rarity IN (${placeholders(filters.rarities.length)})`, ...filters.rarities);
  }
  if (filters.attributes?.length) {
    q.where(`c.id IN (SELECT card_id FROM card_attributes WHERE attribute IN (${placeholders(filters.attributes.length)}))`, ...filters.attributes);
  }
  if (filters.costMin != null) q.where('c.cost >= ?', filters.costMin);
  if (filters.costMax != null) q.where('c.cost <= ?', filters.costMax);
  if (filters.powerMin != null) q.where('c.power >= ?', filters.powerMin);
  if (filters.powerMax != null) q.where('c.power <= ?', filters.powerMax);
  if (filters.setPrefix) q.where("c.id LIKE ?", `${filters.setPrefix}-%`);
  if (filters.blocks?.length) {
    q.where(`c.block_number IN (${placeholders(filters.blocks.length)})`, ...filters.blocks);
  }
  if (filters.colors?.length) {
    q.where(`c.id IN (SELECT card_id FROM card_colors WHERE color IN (${placeholders(filters.colors.length)}))`, ...filters.colors);
  }

  // Deduplicate: one result per "base" card ID (strip _p1, _r1, etc. suffixes).
  // MIN(id) picks the base card alphabetically (EB02-010 < EB02-010_p1).
  // If only a parallel exists (no base), MIN picks that parallel.
  // Dedup is applied AFTER all filters, so rarity filters on parallels work correctly.
  q.dedup('cards', "CASE WHEN INSTR(c.id, '_') > 0 THEN SUBSTR(c.id, 1, INSTR(c.id, '_') - 1) ELSE c.id END");

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const countQ = q.count('cards c');
  const countRes = db.exec(countQ.sql, countQ.params);
  const total = (countRes[0]?.values[0]?.[0] as number) || 0;

  const dataQ = q.select(buildCardColumns(), 'cards c', limit, offset);
  const dataRes = db.exec(dataQ.sql, dataQ.params);

  const cards: unknown[] = [];
  if (dataRes[0]) {
    for (const row of dataRes[0].values) {
      cards.push(rowToCard(row));
    }
  }

  return { cards, total };
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(',');
}

function queryPacks(db: Database): unknown[] {
  const result = db.exec('SELECT id, language, prefix, title, label, raw_title FROM packs ORDER BY id');
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    id: row[0], language: row[1], prefix: row[2], title: row[3], label: row[4], raw_title: row[5],
  }));
}

function querySets(db: Database): string[] {
  const result = db.exec("SELECT DISTINCT SUBSTR(id, 1, INSTR(id, '-') - 1) as prefix FROM cards ORDER BY prefix");
  if (!result[0]) return [];
  return result[0].values.map((row) => row[0] as string);
}

function queryBlocks(db: Database): number[] {
  const result = db.exec('SELECT DISTINCT block_number FROM cards WHERE block_number IS NOT NULL ORDER BY block_number');
  if (!result[0]) return [];
  return result[0].values.map((row) => row[0] as number);
}

function getCardById(db: Database, id: string): unknown | null {
  const result = db.exec(
    `SELECT c.id, c.name, c.rarity, c.category, c.cost, c.power, c.counter,
            c.effect, c.trigger_text, c.block_number,
            c.colors_json, c.attributes_json, c.types_json
     FROM cards c
     WHERE c.id = ?`,
    [id]
  );
  if (!result[0]?.values[0]) return null;
  return rowToCard(result[0].values[0]);
}

function getCardPacks(db: Database, cardId: string): unknown[] {
  const result = db.exec(
    `SELECT DISTINCT p.id, p.label, p.raw_title, cp.language
     FROM card_packs cp
     JOIN packs p ON cp.pack_id = p.id AND cp.language = p.language
     WHERE cp.card_id = ?
     ORDER BY p.id`,
    [cardId]
  );
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    packId: row[0], label: row[1], rawTitle: row[2], language: row[3],
  }));
}

function getCardImages(db: Database, cardId: string): unknown[] {
  const result = db.exec(
    `SELECT language, img_full_url FROM card_images
     WHERE card_id = ? AND img_full_url IS NOT NULL AND img_full_url != ''
        ORDER BY CASE WHEN language = 'english' THEN 0 WHEN language = 'english-asia' THEN 1 ELSE 2 END`,
    [cardId]
  );
  if (!result[0]) return [];
  return result[0].values.map((row) => ({ language: row[0], imgUrl: row[1] }));
}

function getCardVariants(db: Database, cardId: string): unknown[] {
  const baseId = cardId.replace(/_p\d+$/, '');
  const result = db.exec(
    `SELECT c.id, c.name, c.rarity, c.category, c.cost, c.power, c.counter, c.effect, c.trigger_text, c.block_number,
            c.colors_json, c.attributes_json, c.types_json
     FROM cards c
     WHERE c.id = ? OR c.id LIKE ?
     ORDER BY CASE WHEN c.id = ? THEN 0 ELSE 1 END, c.id`,
    [baseId, `${baseId}_p%`, baseId]
  );
  if (!result[0]) return [];

  const variants: unknown[] = [];
  for (const row of result[0].values) {
    const variantId = row[0] as string;
    const imagesResult = db.exec(
      `SELECT language, img_full_url FROM card_images
       WHERE card_id = ? AND img_full_url IS NOT NULL AND img_full_url != ''
       ORDER BY CASE WHEN language = 'english' THEN 0 WHEN language = 'english-asia' THEN 1 ELSE 2 END`,
      [variantId]
    );
    const images = imagesResult[0]
      ? imagesResult[0].values.map((imgRow) => ({ language: imgRow[0], imgUrl: imgRow[1] }))
      : [];

    variants.push({
      card: rowToCard(row),
      images,
    });
  }

  return variants;
}

function getRelatedCards(db: Database, cardId: string, types: string[], limit: number): unknown[] {
  const q = new QueryBuilder();
  q.where('c.id != ?', cardId);

  if (types.length > 0) {
    const likeConditions = types.map(() => 'c.types_json LIKE ?').join(' OR ');
    q.where(`(${likeConditions})`, ...types.map((t) => `%"${t}"%`));
  }

  const dataQ = q.select(buildCardColumns(), 'cards c', limit, 0);
  const dataRes = db.exec(dataQ.sql, dataQ.params);

  const cards: unknown[] = [];
  if (dataRes[0]) {
    for (const row of dataRes[0].values) {
      cards.push(rowToCard(row));
    }
  }

  return cards;
}

/* ── Worker message handler ───────────────────────────────────── */

self.onmessage = async (e: MessageEvent<{ type: string; id: string; payload?: unknown }>) => {
  const { type, id, payload } = e.data;

  try {
    switch (type) {
      case 'init': {
        const SQL = await initSqlJs({ locateFile: (file: string) => `/${file}` });
        const response = await fetch('/optcg.db');
        const buffer = await response.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buffer));
        self.postMessage({ type: 'init-done', id });
        break;
      }
      case 'queryCards': {
        if (!db) throw new Error('DB not initialized');
        const result = queryCards(db, payload as QueryCardsFilters);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'queryPacks': {
        if (!db) throw new Error('DB not initialized');
        const result = queryPacks(db);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'querySets': {
        if (!db) throw new Error('DB not initialized');
        const result = querySets(db);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'queryBlocks': {
        if (!db) throw new Error('DB not initialized');
        const result = queryBlocks(db);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'getCardById': {
        if (!db) throw new Error('DB not initialized');
        const { id: cardId } = payload as { id: string };
        const result = getCardById(db, cardId);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'getCardPacks': {
        if (!db) throw new Error('DB not initialized');
        const { cardId } = payload as { cardId: string };
        const result = getCardPacks(db, cardId);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'getCardImages': {
        if (!db) throw new Error('DB not initialized');
        const { cardId } = payload as { cardId: string };
        const result = getCardImages(db, cardId);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'getRelatedCards': {
        if (!db) throw new Error('DB not initialized');
        const { cardId: relCardId, types, limit } = payload as { cardId: string; types: string[]; limit?: number };
        const result = getRelatedCards(db, relCardId, types, limit || 8);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      case 'getCardVariants': {
        if (!db) throw new Error('DB not initialized');
        const { cardId: variantCardId } = payload as { cardId: string };
        const result = getCardVariants(db, variantCardId);
        self.postMessage({ type: 'result', id, data: result });
        break;
      }
      default:
        self.postMessage({ type: 'error', id, error: `Unknown message type: ${type}` });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, error: String(err) });
  }
};