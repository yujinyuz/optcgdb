#!/usr/bin/env python3
"""
Seed an SQLite database for One Piece TCG from a local clone of Punk Records.

English is the primary source (most complete card set).
English-Asia fills gaps for cards not yet available in English (e.g. ST30).
Cards from english-asia are stored as 'english' language and are overwritten
when the English source becomes available.

Usage:
    python seed.py [--languages english english-asia japanese] [--db optcg.db] [--clean]

No external dependencies required — reads from vendor/punk-records.
"""

import argparse
import html
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent
VENDOR = ROOT / "vendor" / "punk-records"
DEFAULT_LANGUAGES = ["english", "english-asia", "japanese"]
DEFAULT_DB = "optcg.db"
SCHEMA_FILE = ROOT / "schema.sql"


def decode_html(text: str) -> str:
    """Decode HTML entities in text (e.g. &amp; -> &)."""
    return html.unescape(text) if text else text


def load_json(path: Path):
    """Load and parse a local JSON file."""
    with open(path) as f:
        return json.load(f)


def create_database(db_path: str, clean: bool = False):
    """Create the SQLite database with the schema."""
    if clean and Path(db_path).exists():
        Path(db_path).unlink()

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")

    schema_sql = SCHEMA_FILE.read_text()
    conn.executescript(schema_sql)
    conn.commit()
    return conn


def seed_packs(conn: sqlite3.Connection, language: str) -> dict:
    """Insert pack data for a language from local files."""
    print(f"  Loading packs for {language}...")
    packs: dict = load_json(VENDOR / language / "packs.json")

    inserted = 0
    for pack_id, pack in packs.items():
        conn.execute(
            """INSERT OR IGNORE INTO packs (id, language, prefix, title, label, raw_title)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                pack_id,
                language,
                decode_html(pack.get("title_parts", {}).get("prefix") or ""),
                decode_html(pack.get("title_parts", {}).get("title") or ""),
                decode_html(pack.get("title_parts", {}).get("label") or ""),
                decode_html(pack.get("raw_title", "")),
            ),
        )
        inserted += 1

    conn.commit()
    print(f"  Inserted {inserted} packs for {language}")
    return packs


def build_block_number_map() -> dict[str, int]:
    """Build a mapping of card_id -> block_number from Japanese source data."""
    block_map: dict[str, int] = {}
    jp_packs_file = VENDOR / "japanese" / "packs.json"
    if not jp_packs_file.exists():
        print("  Warning: Japanese packs.json not found, block_number mapping will be empty")
        return block_map

    jp_packs = load_json(jp_packs_file)
    jp_data_dir = VENDOR / "japanese" / "data"

    for pack_id in jp_packs:
        card_file = jp_data_dir / f"{pack_id}.json"
        if not card_file.exists():
            continue
        cards = load_json(card_file)
        for card in cards:
            bn = card.get("block_number")
            if bn is not None:
                block_map[card["id"]] = bn

    print(f"  Built block_number map: {len(block_map)} cards")
    return block_map


def seed_cards(conn: sqlite3.Connection, language: str, packs: dict, block_map: dict[str, int], is_primary: bool, existing_ids: set[str] | None = None):
    """Insert card data for all packs in a language from local files.

    Each card (base + variants) gets its own row in the cards table with a
    base_id column for grouping. No parallel_json needed.

    All card IDs are inserted into card_packs, card_images, junction tables,
    and FTS.

    existing_ids: set of base_ids that already exist before this pass
                  (used by english-asia to identify gap-fill cards)
    """
    total_cards = 0
    new_base_cards = 0
    data_dir = VENDOR / language / "data"

    # --- Pass 1: collect all cards from this language ---
    all_cards: list[dict] = []
    for pack_id in packs:
        card_file = data_dir / f"{pack_id}.json"
        if not card_file.exists():
            print(f"    Skipping {pack_id} (file not found)")
            continue
        all_cards.extend(load_json(card_file))

    # --- Pass 2: determine canonical data per base_id ---
    # For primary/gap-fill languages, insert rows into cards table.
    # Pick canonical card data (prefer non-parallel variants for name/effect/etc).
    base_cards: dict[str, dict] = {}
    for card in all_cards:
        card_id = card["id"]
        base_id = card_id.split("_")[0] if "_" in card_id else card_id
        if base_id not in base_cards:
            base_cards[base_id] = card
        if card_id == base_id:
            base_cards[base_id] = card

    # Insert every card as its own row (only for primary or gap-fill)
    for card in all_cards:
        card_id = card["id"]
        base_id = card_id.split("_")[0] if "_" in card_id else card_id

        canonical = base_cards[base_id]

        if not is_primary:
            if language in ("english-asia", "japanese") and existing_ids and card_id in existing_ids:
                # Card already exists from primary source — but check if
                # english-asia has <br> in effect/trigger that english lacks.
                if language == "english-asia":
                    ea_effect = canonical.get("effect") or ""
                    ea_trigger = canonical.get("trigger") or ""
                    if "<br>" in ea_effect or "<br>" in ea_trigger:
                        existing = conn.execute(
                            "SELECT effect, trigger_text FROM cards WHERE id = ?", (card_id,)
                        ).fetchone()
                        if existing:
                            new_effect = decode_html(ea_effect) if "<br>" in ea_effect else existing[0]
                            new_trigger = decode_html(ea_trigger) if "<br>" in ea_trigger else existing[1]
                            if new_effect != existing[0] or new_trigger != existing[1]:
                                conn.execute(
                                    "UPDATE cards SET effect = ?, trigger_text = ? WHERE id = ?",
                                    (new_effect, new_trigger, card_id),
                                )
                continue
            if language not in ("english-asia", "japanese"):
                continue

        block_number = block_map.get(card_id, block_map.get(base_id, canonical.get("block_number")))

        cursor = conn.execute(
            """INSERT OR REPLACE INTO cards
               (id, base_id, name, rarity, category, cost, power, counter, effect, trigger_text, block_number, colors_json, attributes_json, types_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                card_id,
                base_id,
                decode_html(canonical.get("name", "")),
                card.get("rarity", ""),
                canonical.get("category", ""),
                canonical.get("cost"),
                canonical.get("power"),
                canonical.get("counter"),
                decode_html(canonical.get("effect") or ""),
                decode_html(canonical.get("trigger") or ""),
                block_number,
                json.dumps(canonical.get("colors", [])),
                json.dumps(canonical.get("attributes", [])),
                json.dumps([decode_html(t) for t in canonical.get("types", [])]),
            ),
        )
        if cursor.rowcount > 0:
            new_base_cards += 1

    # --- Pass 3: insert ALL individual cards into auxiliary tables ---
    for card in all_cards:
        card_id = card["id"]
        card_pack_id = card.get("pack_id", card.get("pack", "unknown"))
        base_id = card_id.split("_")[0] if "_" in card_id else card_id

        # English-asia fills gaps only — skip if english already had this card
        # (check card_id, not base_id, so _p variants get through)
        if language == "english-asia" and existing_ids and card_id in existing_ids:
            continue

        # Pack membership (all languages, all variants)
        conn.execute(
            "INSERT OR IGNORE INTO card_packs (card_id, pack_id, language) VALUES (?, ?, ?)",
            (card_id, card_pack_id, language),
        )

        # Image URLs (all languages, all variants)
        conn.execute(
            """INSERT OR REPLACE INTO card_images
               (card_id, language, img_url, img_full_url)
               VALUES (?, ?, ?, ?)""",
            (card_id, language, card.get("img_url", ""), card.get("img_full_url", "")),
        )

        # Junction tables: for primary language or english-asia gap-fillers
        if is_primary or language == "english-asia":
            for color in card.get("colors", []):
                conn.execute(
                    "INSERT OR IGNORE INTO card_colors (card_id, color) VALUES (?, ?)",
                    (base_id, color),
                )

            for attribute in card.get("attributes", []):
                conn.execute(
                    "INSERT OR IGNORE INTO card_attributes (card_id, attribute) VALUES (?, ?)",
                    (base_id, attribute),
                )

            for card_type in card.get("types", []):
                conn.execute(
                    "INSERT OR IGNORE INTO card_types (card_id, type) VALUES (?, ?)",
                    (base_id, card_type),
                )

            # FTS index: index ALL variant IDs so searching by "OP01-001_p1" works
            search_text = " ".join(filter(None, [
                card_id,
                card.get("name", ""),
                card.get("effect", "") or "",
                card.get("trigger", "") or "",
            ]))
            conn.execute(
                "INSERT OR IGNORE INTO cards_fts (card_id, search_text) VALUES (?, ?)",
                (card_id, search_text),
            )

        # Translations: store non-primary language text
        if not is_primary and language != "english":
            conn.execute(
                """INSERT OR IGNORE INTO card_translations (card_id, language, name, effect, trigger_text, types_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    base_id,
                    language,
                    decode_html(card.get("name", "")),
                    decode_html(card.get("effect") or ""),
                    decode_html(card.get("trigger") or ""),
                    json.dumps([decode_html(t) for t in card.get("types", [])]),
                ),
            )
            # Also add to FTS so searching in this language works
            search_text = " ".join(filter(None, [
                decode_html(card.get("name", "")),
                decode_html(card.get("effect") or ""),
                decode_html(card.get("trigger") or ""),
            ]))
            if search_text.strip():
                conn.execute(
                    "INSERT INTO cards_fts (card_id, search_text) VALUES (?, ?)",
                    (base_id, search_text),
                )

        total_cards += 1

    conn.commit()
    print(f"  {language}: {total_cards} cards processed, {new_base_cards} new unique")
    return total_cards, new_base_cards


def rebuild_fts_index(conn: sqlite3.Connection):
    """Rebuild cards_fts to include base card text + all translations."""
    conn.execute("DELETE FROM cards_fts")
    conn.execute("""
        INSERT INTO cards_fts (card_id, search_text)
        SELECT c.id,
               COALESCE(c.name, '') || ' ' ||
               COALESCE(c.effect, '') || ' ' ||
               COALESCE(c.trigger_text, '') || ' ' ||
               COALESCE((SELECT GROUP_CONCAT(t.name || ' ' || t.effect || ' ' || t.trigger_text, ' ')
                         FROM card_translations t
                         WHERE t.card_id = c.id), '')
        FROM cards c
    """)
    conn.commit()


def update_search_text(conn: sqlite3.Connection):
    """No-op: search_text column removed from cards table.
    FTS data remains in cards_fts virtual table for search queries.
    """
    pass


def build_card_best_images(conn: sqlite3.Connection):
    """Pre-compute best image URLs per card to eliminate correlated subquery at query time."""
    conn.execute("DELETE FROM card_best_images")
    conn.execute("""
        INSERT INTO card_best_images (card_id, img_url_en, img_url_jp)
        SELECT
            card_id,
            MAX(CASE WHEN language = 'english' THEN img_full_url END),
            MAX(CASE WHEN language = 'japanese' THEN img_full_url END)
        FROM card_images
        WHERE img_full_url IS NOT NULL AND img_full_url != ''
        GROUP BY card_id
    """)
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Seed OPTCG database from local Punk Records data")
    parser.add_argument(
        "--languages",
        nargs="+",
        default=DEFAULT_LANGUAGES,
        choices=["english", "english-asia", "japanese", "chinese-hongkong", "chinese-taiwan", "thai", "french"],
        help="Languages to import (english-asia should be first for primary data)",
    )
    parser.add_argument("--db", default=DEFAULT_DB, help="SQLite database path")
    parser.add_argument("--clean", action="store_true", help="Delete existing database before seeding")
    args = parser.parse_args()

    if not VENDOR.exists():
        print(f"Error: {VENDOR} not found. Clone the repo first:")
        print(f"  git clone https://github.com/buhbbl/punk-records.git {VENDOR}")
        return

    print(f"Creating database: {args.db}")
    conn = create_database(args.db, clean=args.clean)

    print("\nBuilding block_number mapping from Japanese data...")
    block_map = build_block_number_map()

    total_unique = 0
    for i, language in enumerate(args.languages):
        is_primary = (i == 0)

        # Track which base_ids exist before each pass (for english-asia gap-fill logic)
        if is_primary:
            existing_ids: set[str] | None = None
        else:
            existing_ids = set(
                row[0] for row in conn.execute("SELECT id FROM cards").fetchall()
            )

        print(f"\nProcessing {language}...{' (primary)' if is_primary else ' (secondary)'}")
        packs = seed_packs(conn, language)
        total, unique = seed_cards(conn, language, packs, block_map, is_primary, existing_ids)
        total_unique += unique
        print(f"  Total cards for {language}: {total} ({unique} new unique)")

    rebuild_fts_index(conn)
    update_search_text(conn)
    build_card_best_images(conn)

    # Print summary
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM packs")
    pack_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM cards")
    card_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT base_id) FROM cards")
    unique_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM card_packs")
    pack_memberships = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM card_images")
    image_count = cur.fetchone()[0]

    print(f"\n✓ Database seeded: {pack_count} packs, {unique_count} unique cards ({card_count} total rows)")
    print(f"  Pack memberships: {pack_memberships}")
    print(f"  Image variants: {image_count}")

    conn.close()


if __name__ == "__main__":
    main()
