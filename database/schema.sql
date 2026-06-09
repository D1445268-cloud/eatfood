-- database/schema.sql
-- 逢甲店家資料表 (升級版：支援豐富前端解耦與多維度高精度篩選)

CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price_range TEXT,            -- 價格等級 ($, $$, $$$)
    avg_price INTEGER,           -- 平均消費金額 (例如 180)
    meal_type TEXT,              -- 餐點類型 (如 小吃, 主食, 甜點, 飲料)
    walking_distance INTEGER,    -- 步行距離 (分鐘)
    sub_area TEXT,               -- 細分商圈區域 (如 文華路, 慶和街)
    latitude REAL,               -- 緯度
    longitude REAL,              -- 經度
    google_maps_url TEXT,        -- Google 地圖網址
    rating REAL,                 -- Google 評分 (如 4.6)
    reviews_count INTEGER,       -- 評論數量
    opening_hours TEXT,          -- 營業時間段 (格式如 17:00-23:30)
    off_days TEXT,               -- 每週公休日 (如 星期二 或 無)
    student_discount TEXT,       -- 學生證優惠細節
    special_offer TEXT,          -- 轉盤專屬優惠
    description TEXT,            -- 店家特色描述 (用於 Modal 顯示)
    featured_image TEXT,         -- 精選相片 URL
    image_url TEXT,              -- 額外 Google Map 照片網址 (F-03 專用)
    recommended_items TEXT,      -- 推薦必點餐點 (以分號分隔儲存)
    dining_scenario TEXT,        -- 適合用餐場景 (分號分隔)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以提升分類查詢效能
CREATE INDEX IF NOT EXISTS idx_meal_type ON stores(meal_type);
CREATE INDEX IF NOT EXISTS idx_price_range ON stores(price_range);
CREATE INDEX IF NOT EXISTS idx_avg_price ON stores(avg_price);
CREATE INDEX IF NOT EXISTS idx_walking_distance ON stores(walking_distance);

-- 使用者收藏店家資料表 (F-05 我的最愛與收藏模組)
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default_user',  -- 支援未來多使用者擴充，預設為 default_user
    store_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(user_id, store_id)                      -- 避免重複收藏同一個店家
);

-- 建立索引以提升收藏查詢效能
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
