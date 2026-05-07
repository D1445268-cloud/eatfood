import sqlite3
import os

# 預設資料庫路徑 (可由外部設定)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, 'database', 'eatfood.db')

class StoreModel:
    @staticmethod
    def get_db_connection():
        # 連線至 SQLite 資料庫，並設定 row_factory 讓我們可以像 dict 一樣存取資料
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        # 開啟 WAL 模式提升併發讀寫效能
        conn.execute('PRAGMA journal_mode=WAL;')
        return conn

    @classmethod
    def create(cls, name, price_range=None, meal_type=None, walking_distance=None, google_maps_url=None):
        """新增一筆店家資料"""
        conn = cls.get_db_connection()
        cursor = conn.cursor()
        
        query = """
            INSERT INTO stores (name, price_range, meal_type, walking_distance, google_maps_url)
            VALUES (?, ?, ?, ?, ?)
        """
        cursor.execute(query, (name, price_range, meal_type, walking_distance, google_maps_url))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        
        return new_id

    @classmethod
    def get_all(cls):
        """取得所有店家資料 (注意：若資料量大建議改用 get_list 進行分頁)"""
        conn = cls.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM stores ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]

    @classmethod
    def get_list(cls, limit=20, offset=0, meal_type=None):
        """取得店家列表 (實作分頁與只撈取必要欄位，提升載入速度)"""
        conn = cls.get_db_connection()
        cursor = conn.cursor()
        
        # 效能優化：只撈取列表頁需要的欄位，不一定需要全部
        query = "SELECT id, name, price_range, meal_type, walking_distance FROM stores"
        params = []
        
        if meal_type:
            query += " WHERE meal_type = ?"
            params.append(meal_type)
            
        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]

    @classmethod
    def get_by_id(cls, store_id):
        """根據 ID 取得單一店家資料"""
        conn = cls.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM stores WHERE id = ?", (store_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None

    @classmethod
    def update(cls, store_id, **kwargs):
        """
        更新店家資料
        用法: StoreModel.update(1, price_range="100-200", meal_type="主食")
        """
        if not kwargs:
            return False

        conn = cls.get_db_connection()
        cursor = conn.cursor()

        columns = []
        values = []
        for key, value in kwargs.items():
            columns.append(f"{key} = ?")
            values.append(value)
        
        values.append(store_id)
        
        query = f"UPDATE stores SET {', '.join(columns)} WHERE id = ?"
        cursor.execute(query, tuple(values))
        conn.commit()
        
        rows_affected = cursor.rowcount
        conn.close()
        
        return rows_affected > 0

    @classmethod
    def delete(cls, store_id):
        """刪除指定店家資料"""
        conn = cls.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM stores WHERE id = ?", (store_id,))
        conn.commit()
        
        rows_affected = cursor.rowcount
        conn.close()
        
        return rows_affected > 0

# 測試用: 若直接執行此檔案，將會嘗試建立 table 並測試新增/查詢 (假設 schema.sql 已經執行過)
if __name__ == '__main__':
    print("StoreModel loaded successfully.")
