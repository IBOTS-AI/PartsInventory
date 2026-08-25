-- 0001_init_schema.sql
-- Initial schema for IBOTS Team 2370 inventory system.
-- Naming: snake_case tables/columns, bigserial surrogate keys, timestamptz for all timestamps.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive text for names/aliases/skus
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- fuzzy/partial text search on names & aliases

-- Shared trigger to keep updated_at current on every row update.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- categories: shop color/type groupings (independent of physical location)
-- =========================================================================
CREATE TABLE categories (
  id           BIGSERIAL PRIMARY KEY,
  name         CITEXT NOT NULL UNIQUE,
  short_code   CITEXT NOT NULL UNIQUE,
  description  TEXT,
  color        TEXT NOT NULL, -- hex color, e.g. #1E88E5
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_color_hex_chk CHECK (color ~* '^#[0-9A-F]{6}$')
);

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- locations: self-referencing hierarchy (shop -> shelf -> section -> bin)
-- =========================================================================
CREATE TABLE locations (
  id             BIGSERIAL PRIMARY KEY,
  parent_id      BIGINT REFERENCES locations(id) ON DELETE RESTRICT,
  location_type  TEXT NOT NULL CHECK (location_type IN ('shop', 'shelf', 'section', 'bin', 'other')),
  name           TEXT NOT NULL,
  code           TEXT, -- short human-readable label printed on bin/shelf labels, e.g. "B3"
  qr_uuid        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE, -- stable id for QR/barcode scanning
  notes          TEXT,
  sort_order     INT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, name)
);

CREATE INDEX idx_locations_parent_id ON locations(parent_id);

CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- parts: catalog of inventory items (quantities live in `inventory`, not here)
-- =========================================================================
CREATE TABLE parts (
  id                        BIGSERIAL PRIMARY KEY,
  qr_uuid                   UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE, -- stable id for QR/barcode scanning
  sku                       CITEXT UNIQUE,
  name                      TEXT NOT NULL,
  description               TEXT,
  category_id               BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  manufacturer              TEXT,
  manufacturer_part_number  TEXT,
  manufacturer_url          TEXT,
  unit_of_measure           TEXT NOT NULL DEFAULT 'each',
  minimum_quantity          NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  reorder_quantity          NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (reorder_quantity >= 0),
  primary_location_id       BIGINT REFERENCES locations(id) ON DELETE SET NULL, -- quick-reference "home" location
  notes                     TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parts_category_id ON parts(category_id);
CREATE INDEX idx_parts_primary_location_id ON parts(primary_location_id);
CREATE INDEX idx_parts_is_active ON parts(is_active);
CREATE INDEX idx_parts_name_trgm ON parts USING gin (name gin_trgm_ops);

CREATE TRIGGER trg_parts_updated_at
BEFORE UPDATE ON parts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- part_aliases: alternate search terms for a part
-- =========================================================================
CREATE TABLE part_aliases (
  id          BIGSERIAL PRIMARY KEY,
  part_id     BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  alias       CITEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (part_id, alias)
);

CREATE INDEX idx_part_aliases_alias_trgm ON part_aliases USING gin (alias gin_trgm_ops);

-- =========================================================================
-- part_images: metadata only; actual files live on the filesystem
-- =========================================================================
CREATE TABLE part_images (
  id            BIGSERIAL PRIMARY KEY,
  part_id       BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  file_path     TEXT, -- path relative to the server's image storage root
  external_url  TEXT, -- e.g. manufacturer product image
  source_type   TEXT NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload', 'manufacturer', 'other')),
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT part_images_source_chk CHECK (file_path IS NOT NULL OR external_url IS NOT NULL)
);

CREATE INDEX idx_part_images_part_id ON part_images(part_id);
-- Only one primary image per part.
CREATE UNIQUE INDEX uq_part_images_primary ON part_images(part_id) WHERE is_primary;

-- =========================================================================
-- suppliers
-- =========================================================================
CREATE TABLE suppliers (
  id             BIGSERIAL PRIMARY KEY,
  name           CITEXT NOT NULL UNIQUE,
  website_url    TEXT,
  contact_name   TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- part_suppliers: many-to-many, supplier-specific pricing/part numbers
-- =========================================================================
CREATE TABLE part_suppliers (
  id                    BIGSERIAL PRIMARY KEY,
  part_id               BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  supplier_id           BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_part_number  TEXT,
  product_url           TEXT,
  price                 NUMERIC(12, 2) CHECK (price >= 0),
  currency              TEXT NOT NULL DEFAULT 'USD',
  is_preferred          BOOLEAN NOT NULL DEFAULT false,
  last_ordered_at       TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (part_id, supplier_id)
);

CREATE INDEX idx_part_suppliers_supplier_id ON part_suppliers(supplier_id);
-- Only one preferred supplier per part.
CREATE UNIQUE INDEX uq_part_suppliers_preferred ON part_suppliers(part_id) WHERE is_preferred;

CREATE TRIGGER trg_part_suppliers_updated_at
BEFORE UPDATE ON part_suppliers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- inventory: quantity of a part at a specific location (many locations/part)
-- =========================================================================
CREATE TABLE inventory (
  id           BIGSERIAL PRIMARY KEY,
  part_id      BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  location_id  BIGINT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT, -- can't remove a location that still holds stock
  quantity     NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (part_id, location_id)
);

CREATE INDEX idx_inventory_part_id ON inventory(part_id);
CREATE INDEX idx_inventory_location_id ON inventory(location_id);

CREATE TRIGGER trg_inventory_updated_at
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- inventory_transactions: append-only audit log of every quantity change
-- =========================================================================
CREATE TABLE inventory_transactions (
  id                   BIGSERIAL PRIMARY KEY,
  part_id              BIGINT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT, -- keep history; deactivate parts instead of deleting
  location_id          BIGINT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  related_location_id  BIGINT REFERENCES locations(id) ON DELETE RESTRICT, -- destination location for transfers
  transaction_type     TEXT NOT NULL CHECK (transaction_type IN ('receive', 'remove', 'adjustment', 'transfer')),
  quantity_change      NUMERIC(12, 3) NOT NULL, -- signed delta applied to location_id's quantity
  resulting_quantity   NUMERIC(12, 3) NOT NULL CHECK (resulting_quantity >= 0), -- location_id's quantity after the change
  reason               TEXT,
  performed_by         TEXT, -- free-text operator name; replace/augment with a user_id FK once auth exists
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_transactions_transfer_chk
    CHECK (transaction_type <> 'transfer' OR related_location_id IS NOT NULL)
);

CREATE INDEX idx_inventory_transactions_part_id ON inventory_transactions(part_id);
CREATE INDEX idx_inventory_transactions_location_id ON inventory_transactions(location_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);

-- =========================================================================
-- Reporting views
-- =========================================================================

-- Total on-hand quantity per part, across all locations.
CREATE VIEW v_part_stock AS
SELECT
  p.id AS part_id,
  p.sku,
  p.name,
  p.category_id,
  p.minimum_quantity,
  p.reorder_quantity,
  COALESCE(SUM(i.quantity), 0) AS total_quantity
FROM parts p
LEFT JOIN inventory i ON i.part_id = p.id
WHERE p.is_active
GROUP BY p.id;

-- Parts at or below their minimum desired quantity.
CREATE VIEW v_low_stock AS
SELECT *
FROM v_part_stock
WHERE minimum_quantity > 0 AND total_quantity <= minimum_quantity;

-- Parts with zero total quantity across all locations.
CREATE VIEW v_out_of_stock AS
SELECT *
FROM v_part_stock
WHERE total_quantity <= 0;
