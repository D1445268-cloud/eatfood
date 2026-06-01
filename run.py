# -*- coding: utf-8 -*-
import os
import sqlite3
from flask import Flask, send_from_directory
from app.models.store import StoreModel, DB_PATH

app = Flask(__name__, static_folder='.', static_url_path='', template_folder='.')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'eatfood_secret_key_123')

# 註冊 API 藍圖
from app.routes.store import store_bp
app.register_blueprint(store_bp)

@app.route('/')
def index():
    """首頁路由，直接提供 index.html"""
    return send_from_directory('.', 'index.html')

def init_db():
    """初始化資料庫：如果資料庫不存在，建立資料表並植入測試資料"""
    import csv
    
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database', 'schema.sql')
    
    # 1. 檢測結構是否過時（例如缺少新欄位 avg_price）
    schema_ok = True
    try:
        # 先確認 table 是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'")
        if cursor.fetchone():
            # 嘗試查詢新欄位以確認結構是否最新
            cursor.execute("SELECT avg_price FROM stores LIMIT 1")
    except sqlite3.OperationalError:
        schema_ok = False
        print("偵測到舊版資料庫結構，將自動進行 Schema 升級...")
        
    # 2. 如果結構過時，先刪除舊資料表再重新建立
    if not schema_ok:
        cursor.execute("DROP TABLE IF EXISTS stores")
        conn.commit()
        
    # 3. 讀取 schema.sql 建立最新的資料表與索引
    if os.path.exists(schema_path):
        with open(schema_path, 'r', encoding='utf-8') as f:
            cursor.executescript(f.read())
        conn.commit()
        print("最新資料庫 Schema 載入成功。")
    
    # 4. 檢查是否已有店家資料，若無則進行初始化植入
    cursor.execute("SELECT COUNT(*) FROM stores")
    if cursor.fetchone()[0] == 0:
        csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'store_data_collection_template.csv')
        
        if os.path.exists(csv_path):
            print(f"正在從採集清單 CSV 檔自動匯入店家資料: {csv_path} ...")
            try:
                with open(csv_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        name = row.get('name')
                        if not name:
                            continue
                        
                        # 處理數值欄位的安全轉型
                        avg_price = row.get('avg_price')
                        avg_price = int(avg_price) if avg_price and avg_price.strip().isdigit() else None
                        
                        walking_distance = row.get('walking_distance')
                        walking_distance = int(walking_distance) if walking_distance and walking_distance.strip().isdigit() else None
                        
                        try:
                            latitude = float(row.get('latitude')) if row.get('latitude') else None
                        except ValueError:
                            latitude = None
                            
                        try:
                            longitude = float(row.get('longitude')) if row.get('longitude') else None
                        except ValueError:
                            longitude = None
                            
                        try:
                            rating = float(row.get('rating')) if row.get('rating') else None
                        except ValueError:
                            rating = None
                            
                        reviews_count = row.get('reviews_count')
                        reviews_count = int(reviews_count) if reviews_count and reviews_count.strip().isdigit() else None
                        
                        # 使用 Model 寫入資料庫
                        StoreModel.create(
                            name=name,
                            price_range=row.get('price_range'),
                            avg_price=avg_price,
                            meal_type=row.get('meal_type'),
                            walking_distance=walking_distance,
                            sub_area=row.get('sub_area'),
                            latitude=latitude,
                            longitude=longitude,
                            google_maps_url=row.get('google_maps_url'),
                            rating=rating,
                            reviews_count=reviews_count,
                            opening_hours=row.get('opening_hours'),
                            off_days=row.get('off_days'),
                            student_discount=row.get('student_discount'),
                            special_offer=row.get('special_offer'),
                            description=row.get('description'),
                            featured_image=row.get('featured_image'),
                            recommended_items=row.get('recommended_items'),
                            dining_scenario=row.get('dining_scenario')
                        )
                print("資料庫自 CSV 採集清單匯入 60+（或示範）店家資料成功！")
            except Exception as e:
                print(f"解析 CSV 匯入時發生錯誤: {e}，將使用備用預設店家資料進行初始化...")
                schema_ok = False # 觸發備用初始化
                
        # 備用初始化（若無 CSV 或解析失敗）
        if not os.path.exists(csv_path) or not schema_ok:
            test_stores = [
                ("明倫蛋餅", "$", "小吃", 2, "https://www.google.com/maps/search/?api=1&query=明倫蛋餅+逢甲"),
                ("官芝霖大腸包小腸", "$", "小吃", 3, "https://www.google.com/maps/search/?api=1&query=官芝霖大腸包小腸+逢甲"),
                ("一家之薯起司馬鈴薯", "$", "小吃", 4, "https://www.google.com/maps/search/?api=1&query=一家之薯起司馬鈴薯+逢甲"),
                ("尊品原汁牛肉麵", "$$", "主食", 5, "https://www.google.com/maps/search/?api=1&query=尊品原汁牛肉麵+逢甲"),
                ("極味屋日式拉麵", "$$", "主食", 3, "https://www.google.com/maps/search/?api=1&query=極味屋日式拉麵+逢甲"),
                ("逢甲冰糖葫蘆", "$", "甜點", 1, "https://www.google.com/maps/search/?api=1&query=逢甲地瓜球+逢甲"),
                ("阿華黑輪店", "$", "小吃", 4, "https://www.google.com/maps/search/?api=1&query=阿華黑輪店+逢甲"),
                ("美濃木瓜牛奶", "$", "飲料", 2, "https://www.google.com/maps/search/?api=1&query=美濃木瓜牛奶+逢甲")
            ]
            for s in test_stores:
                StoreModel.create(
                    name=s[0],
                    price_range=s[1],
                    meal_type=s[2],
                    walking_distance=s[3],
                    google_maps_url=s[4]
                )
            print("備用特色測試店家資料初始化成功。")
            
    conn.close()

if __name__ == '__main__':
    # 啟動時先初始化資料庫
    init_db()
    # 啟動 Flask 開發伺服器
    app.run(debug=True, port=5000)
