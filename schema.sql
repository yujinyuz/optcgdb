-- OPTCG Database Schema
-- One Piece Trading Card Game - Offline-first SQLite database
-- English is primary source; english-asia fills gaps (stored as 'english')

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Packs (sets, starter decks, extra boosters, etc.)
CREATE TABLE IF NOT EXISTS packs (
    id TEXT NOT NULL,               -- e.g. "569101"
    language TEXT NOT NULL,          -- "english" or "english-asia"
    prefix TEXT NOT NULL DEFAULT '', -- e.g. "BOOSTER PACK"
    title TEXT NOT NULL DEFAULT '',  -- e.g. "ROMANCE DAWN"
    label TEXT NOT NULL DEFAULT '',  -- e.g. "OP-01"
    raw_title TEXT NOT NULL DEFAULT '', -- e.g. "BOOSTER PACK -ROMANCE DAWN- [OP-01]"
    PRIMARY KEY (id, language)
);

-- Cards: one row per unique card ID.
-- English is the canonical source. English-asia fills gaps for cards
-- not yet available in English (e.g. ST30), stored as 'english' language.
-- English data always overrides english-asia on re-seed.
CREATE TABLE IF NOT EXISTS cards (
    id TEXT NOT NULL PRIMARY KEY,    -- e.g. "OP01-001" or "OP01-001_p1" for variants
    base_id TEXT NOT NULL DEFAULT '', -- base ID for grouping variants (e.g. "OP01-001")
    name TEXT NOT NULL,
    rarity TEXT NOT NULL,
    category TEXT NOT NULL,          -- Leader, Character, Event, Stage, Don
    cost INTEGER,
    power INTEGER,
    counter INTEGER,
    effect TEXT,
    trigger_text TEXT,
    block_number INTEGER,            -- e.g. 1, 2, 3, 4, 5 (from Japanese source data)
    colors_json TEXT NOT NULL DEFAULT '[]',       -- JSON array of colors
    attributes_json TEXT NOT NULL DEFAULT '[]',    -- JSON array of attributes
    types_json TEXT NOT NULL DEFAULT '[]'          -- JSON array of types
);

-- Card packs: which packs (from which language source) contain each card.
-- References both base IDs and parallel variant IDs (_p1, _p2, etc.).
-- No FK to cards.id since variant IDs may not exist in the cards table.
CREATE TABLE IF NOT EXISTS card_packs (
    card_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    language TEXT NOT NULL,
    PRIMARY KEY (card_id, pack_id, language),
    FOREIGN KEY (pack_id, language) REFERENCES packs(id, language)
);

-- Card images: image URLs per language variant.
-- References both base IDs and parallel variant IDs.
-- No FK to cards.id since variant IDs may not exist in the cards table.
CREATE TABLE IF NOT EXISTS card_images (
    card_id TEXT NOT NULL,
    language TEXT NOT NULL,
    img_url TEXT,
    img_full_url TEXT,
    PRIMARY KEY (card_id, language)
);

-- Pre-computed best image URLs per card, per language priority.
-- Eliminates correlated subquery in queryCards.
-- No FK to cards.id since variant IDs may not exist in the cards table.
CREATE TABLE IF NOT EXISTS card_best_images (
    card_id TEXT NOT NULL PRIMARY KEY,
    img_url_en TEXT,       -- english
    img_url_jp TEXT        -- japanese
);

-- Card translations: localized text per language.
-- Stores name, effect, trigger_text in languages other than english.
CREATE TABLE IF NOT EXISTS card_translations (
    card_id TEXT NOT NULL,
    language TEXT NOT NULL,
    name TEXT NOT NULL,
    effect TEXT,
    trigger_text TEXT,
    types_json TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY (card_id, language)
);

-- Card colors (many-to-many, deduplicated across languages)
CREATE TABLE IF NOT EXISTS card_colors (
    card_id TEXT NOT NULL,
    color TEXT NOT NULL,             -- Red, Blue, Green, Purple, Black, Yellow
    PRIMARY KEY (card_id, color),
    FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Card attributes (many-to-many, deduplicated across languages)
CREATE TABLE IF NOT EXISTS card_attributes (
    card_id TEXT NOT NULL,
    attribute TEXT NOT NULL,         -- Strike, Slash, Ranged, Wisdom, Special
    PRIMARY KEY (card_id, attribute),
    FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Card types/factions (many-to-many, deduplicated across languages)
CREATE TABLE IF NOT EXISTS card_types (
    card_id TEXT NOT NULL,
    type TEXT NOT NULL,              -- e.g. "Straw Hat Crew", "Supernovas"
    PRIMARY KEY (card_id, type),
    FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Full-text search index (FTS4)
CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts4(
    card_id TEXT,
    search_text TEXT,
    tokenize=unicode61
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cards_base_id ON cards(base_id);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_cost ON cards(cost);
CREATE INDEX IF NOT EXISTS idx_cards_power ON cards(power);
CREATE INDEX IF NOT EXISTS idx_cards_block_number ON cards(block_number);

-- Composite indexes for common filter combinations (covering index for card list)
CREATE INDEX IF NOT EXISTS idx_cards_category_rarity ON cards(category, rarity);
CREATE INDEX IF NOT EXISTS idx_cards_category_cost ON cards(category, cost);
CREATE INDEX IF NOT EXISTS idx_cards_list_cover ON cards(
    category, rarity, cost, power, counter, block_number, id, name
);

-- Pack indexes
CREATE INDEX IF NOT EXISTS idx_packs_label ON packs(label);
CREATE INDEX IF NOT EXISTS idx_packs_label_language ON packs(label, language, raw_title);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_card_colors_color ON card_colors(color);
CREATE INDEX IF NOT EXISTS idx_card_attributes_attribute ON card_attributes(attribute);
CREATE INDEX IF NOT EXISTS idx_card_packs_card_id ON card_packs(card_id);
CREATE INDEX IF NOT EXISTS idx_card_packs_pack_id ON card_packs(pack_id);
CREATE INDEX IF NOT EXISTS idx_card_images_card_id ON card_images(card_id);
CREATE INDEX IF NOT EXISTS idx_card_translations_card_id ON card_translations(card_id);
