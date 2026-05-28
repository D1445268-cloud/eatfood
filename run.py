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

@app.route('/admin')
def admin():
    """後台管理頁面，直接提供 admin.html"""
    return send_from_directory('.', 'admin.html')

def init_db():
    """初始化資料庫：如果資料庫不存在，建立資料表並植入測試資料"""
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 讀取 schema.sql 建立資料表
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database', 'schema.sql')
    if os.path.exists(schema_path):
        with open(schema_path, 'r', encoding='utf-8') as f:
            cursor.executescript(f.read())
        conn.commit()
        print("Database schema loaded successfully.")
    
    # 檢查是否已有店家資料，若無，植入 8 筆特色測試店家！
    cursor.execute("SELECT COUNT(*) FROM stores")
    if cursor.fetchone()[0] == 0:
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
        
        cursor.executemany(
            "INSERT INTO stores (name, price_range, meal_type, walking_distance, google_maps_url) VALUES (?, ?, ?, ?, ?)",
            test_stores
        )
        conn.commit()
        print("Test store data seeded successfully.")
        
    conn.close()

if __name__ == '__main__':
    # 啟動時先初始化資料庫
    init_db()
    # 啟動 Flask 開發伺服器
    app.run(debug=True, port=5000)
