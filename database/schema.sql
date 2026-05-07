-- database/schema.sql
-- 逢甲店家資料表

CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price_range TEXT,
    meal_type TEXT,
    walking_distance INTEGER,
    google_maps_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以提升分類查詢效能
CREATE INDEX IF NOT EXISTS idx_meal_type ON stores(meal_type);
CREATE INDEX IF NOT EXISTS idx_price_range ON stores(price_range);
