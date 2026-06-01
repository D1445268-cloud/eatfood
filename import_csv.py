# -*- coding: utf-8 -*-
"""
逢甲美食大轉盤 - 店家 CSV 資料批次匯入指令碼

本指令碼讀取指定之 CSV 店家資料清單，自動進行格式轉換與安全校驗，
並包含「店家名稱重複檢查機制」，以確保不會重複新增相同的店家，維持資料整潔性。

用法：
    python import_csv.py                 # 預設匯入 docs/store_data_collection_template.csv
    python import_csv.py custom_list.csv # 匯入自訂路徑的 CSV 檔案
"""

import os
import sys
import csv
import sqlite3

# 將專案根目錄加入 Python 搜尋路徑中
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.store import StoreModel, DB_PATH

DEFAULT_CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'store_data_collection_template.csv')

def check_store_exists(name):
    """
    檢查資料庫中是否已存在相同名稱的店家。
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 確保 tables 存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'")
    if not cursor.fetchone():
        conn.close()
        return False
        
    cursor.execute("SELECT id FROM stores WHERE name = ?", (name,))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def import_csv_to_db(csv_path):
    """
    讀取 CSV 檔案並寫入 SQLite 資料庫（含去重檢測）。
    """
    if not os.path.exists(csv_path):
        print(f"[錯誤] 找不到指定的 CSV 檔案路徑：{csv_path}")
        return
        
    print(f"[讀取] 正在讀取 CSV 檔案：{csv_path}")
    print(f"[庫路徑] 目標資料庫路徑：{DB_PATH}")
    
    # 確保資料庫目錄存在
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        
    success_count = 0
    skip_count = 0
    total_count = 0
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # 檢查 CSV 是否包含必要的 header
            if not reader.fieldnames or 'name' not in reader.fieldnames:
                print("[錯誤] CSV 格式不正確，首行標題欄位必須包含 'name'！")
                return
                
            for row in reader:
                name = row.get('name')
                if not name or name.strip() == "":
                    continue
                
                name = name.strip()
                total_count += 1
                
                # 1. 店家名稱重複檢查機制
                if check_store_exists(name):
                    print(f"[已存在-跳過] 店家「{name}」已存在於資料庫中，維持資料整潔。")
                    skip_count += 1
                    continue
                
                # 2. 安全轉型處理
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
                
                # 3. 寫入資料庫
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
                print(f"[匯入成功] 店家「{name}」已成功寫入資料庫！")
                success_count += 1
                
        print("\n--- 批次匯入工作完成 ---")
        print(f"總計讀取店家數：{total_count} 筆")
        print(f"成功新增店家數：{success_count} 筆")
        print(f"重複跳過店家數：{skip_count} 筆")
        
    except Exception as e:
        print(f"[錯誤] 匯入過程中發生未預期錯誤：{e}")

if __name__ == '__main__':
    # 支援由命令列引數自訂 CSV 檔案路徑
    target_csv = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV_PATH
    import_csv_to_db(target_csv)
