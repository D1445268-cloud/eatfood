# -*- coding: utf-8 -*-
import sqlite3
import os

# 預設資料庫路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, 'database', 'eatfood.db')

class StoreModel:
    @staticmethod
    def get_db_connection():
        # 設定 timeout=10.0 避免讀寫衝突鎖定 (Database Locked)
        conn = sqlite3.connect(DB_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
        # 開啟 WAL 模式提升併發讀寫效能
        conn.execute('PRAGMA journal_mode=WAL;')
        return conn

    @classmethod
    def create(cls, name, price_range=None, avg_price=None, meal_type=None, walking_distance=None, 
               sub_area=None, latitude=None, longitude=None, google_maps_url=None, rating=None, 
               reviews_count=None, opening_hours=None, off_days=None, student_discount=None, 
               special_offer=None, description=None, featured_image=None, image_url=None, recommended_items=None, 
               dining_scenario=None):
        """新增一筆店家資料 (安全防護與例外處理版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO stores (
                    name, price_range, avg_price, meal_type, walking_distance, 
                    sub_area, latitude, longitude, google_maps_url, rating, 
                    reviews_count, opening_hours, off_days, student_discount, 
                    special_offer, description, featured_image, image_url, recommended_items, 
                    dining_scenario
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            cursor.execute(query, (
                name, price_range, avg_price, meal_type, walking_distance,
                sub_area, latitude, longitude, google_maps_url, rating,
                reviews_count, opening_hours, off_days, student_discount,
                special_offer, description, featured_image, image_url, recommended_items,
                dining_scenario
            ))
            conn.commit()
            new_id = cursor.lastrowid
            return new_id
        except sqlite3.Error as e:
            print(f"[Database Error] StoreModel.create 發生錯誤: {e}")
            if conn:
                conn.rollback()
            return None
        finally:
            if conn:
                conn.close()

    @classmethod
    def get_all(cls):
        """取得所有店家資料 (例外安全版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM stores ORDER BY id DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"[Database Error] StoreModel.get_all 發生錯誤: {e}")
            return []
        finally:
            if conn:
                conn.close()

    @classmethod
    def get_list(cls, limit=20, offset=0, meal_type=None):
        """取得店家列表 (分頁與例外安全版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            
            query = "SELECT id, name, price_range, meal_type, walking_distance FROM stores"
            params = []
            
            if meal_type:
                query += " WHERE meal_type = ?"
                params.append(meal_type)
                
            query += " ORDER BY id DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"[Database Error] StoreModel.get_list 發生錯誤: {e}")
            return []
        finally:
            if conn:
                conn.close()

    @classmethod
    def get_by_id(cls, store_id):
        """根據 ID 取得單一店家資料 (例外安全版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM stores WHERE id = ?", (store_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        except sqlite3.Error as e:
            print(f"[Database Error] StoreModel.get_by_id 發生錯誤: {e}")
            return None
        finally:
            if conn:
                conn.close()

    @classmethod
    def update(cls, store_id, **kwargs):
        """
        更新店家資料 (例外安全與防 SQL 注入版)
        用法: StoreModel.update(1, price_range="100-200", meal_type="主食")
        """
        if not kwargs:
            return False

        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()

            columns = []
            values = []
            
            # 使用安全的欄位白名單進行安全驗證，防止 Column Name 注入攻擊
            allowed_columns = {
                'name', 'price_range', 'avg_price', 'meal_type', 'walking_distance',
                'sub_area', 'latitude', 'longitude', 'google_maps_url', 'rating',
                'reviews_count', 'opening_hours', 'off_days', 'student_discount',
                'special_offer', 'description', 'featured_image', 'image_url', 'recommended_items',
                'dining_scenario'
            }
            
            for key, value in kwargs.items():
                if key in allowed_columns:
                    columns.append(f"{key} = ?")
                    values.append(value)
                else:
                    print(f"[Database Warning] StoreModel.update 忽略未授權欄位: {key}")
            
            if not columns:
                return False
                
            values.append(store_id)
            query = f"UPDATE stores SET {', '.join(columns)} WHERE id = ?"
            cursor.execute(query, tuple(values))
            conn.commit()
            
            rows_affected = cursor.rowcount
            return rows_affected > 0
        except sqlite3.Error as e:
            print(f"[Database Error] StoreModel.update 發生錯誤: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()

    @classmethod
    def delete(cls, store_id):
        """刪除指定店家資料 (例外安全版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM stores WHERE id = ?", (store_id,))
            conn.commit()
            rows_affected = cursor.rowcount
            return rows_affected > 0
        except sqlite3.Error as e:
            print(f"[Database Error] StoreModel.delete 發生錯誤: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()

    @classmethod
    def get_filtered(cls, price_ranges=None, meal_types=None):
        """根據篩選條件取得店家 (例外安全版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            
            query = "SELECT * FROM stores"
            conditions = []
            params = []
            
            if price_ranges:
                placeholders = ",".join(["?"] * len(price_ranges))
                conditions.append(f"price_range IN ({placeholders})")
                params.extend(price_ranges)
                
            if meal_types:
                placeholders = ",".join(["?"] * len(meal_types))
                conditions.append(f"meal_type IN ({placeholders})")
                params.extend(meal_types)
                
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
                
            query += " ORDER BY id DESC"
            
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"[Database Error] StoreModel.get_filtered 發生錯誤: {e}")
            return []
        finally:
            if conn:
                conn.close()

if __name__ == '__main__':
    print("StoreModel loaded successfully with Exception Handling.")
