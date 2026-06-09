# -*- coding: utf-8 -*-
import sqlite3
import os
from app.models.store import DB_PATH

class FavoriteModel:
    @staticmethod
    def get_db_connection():
        """取得資料庫連線 (防衝突逾時設定)"""
        conn = sqlite3.connect(DB_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
        # 開啟 WAL 模式提升併發讀寫效能
        conn.execute('PRAGMA journal_mode=WAL;')
        return conn

    @classmethod
    def add(cls, user_id, store_id):
        """新增店家至最愛收藏 (例外處理與交易回滾版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            
            # 確保該店家存在
            cursor.execute("SELECT id FROM stores WHERE id = ?", (store_id,))
            if not cursor.fetchone():
                return False, "店家不存在"
            
            # 插入最愛紀錄
            query = "INSERT INTO favorites (user_id, store_id) VALUES (?, ?)"
            cursor.execute(query, (user_id, store_id))
            conn.commit()
            new_id = cursor.lastrowid
            return True, new_id
        except sqlite3.IntegrityError:
            # UNIQUE 限制觸發 (user_id, store_id 已重複)
            if conn:
                conn.rollback()
            return False, "店家已在最愛名單中"
        except sqlite3.Error as e:
            if conn:
                conn.rollback()
            print(f"[Database Error] FavoriteModel.add 發生錯誤: {e}")
            return False, f"資料庫錯誤: {str(e)}"
        except Exception as e:
            if conn:
                conn.rollback()
            return False, f"未預期錯誤: {str(e)}"
        finally:
            if conn:
                conn.close()

    @classmethod
    def remove(cls, user_id, store_id):
        """將店家從最愛收藏中移除 (例外處理與交易回滾版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            query = "DELETE FROM favorites WHERE user_id = ? AND store_id = ?"
            cursor.execute(query, (user_id, store_id))
            conn.commit()
            rows_affected = cursor.rowcount
            return rows_affected > 0
        except sqlite3.Error as e:
            if conn:
                conn.rollback()
            print(f"[Database Error] FavoriteModel.remove 發生錯誤: {e}")
            return False
        except Exception:
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()

    @classmethod
    def get_by_user(cls, user_id):
        """取得特定使用者的所有收藏店家詳細資訊 (例外安全版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            # 使用 INNER JOIN 關聯 stores 表，以取得完整店家細節
            query = """
                SELECT s.*, f.created_at AS favorited_at
                FROM favorites f
                INNER JOIN stores s ON f.store_id = s.id
                WHERE f.user_id = ?
                ORDER BY f.created_at DESC
            """
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.Error as e:
            print(f"[Database Error] FavoriteModel.get_by_user 發生錯誤: {e}")
            return []
        except Exception:
            return []
        finally:
            if conn:
                conn.close()

    @classmethod
    def is_favorite(cls, user_id, store_id):
        """檢查特定店家是否已被該使用者收藏 (例外安全版)"""
        conn = None
        try:
            conn = cls.get_db_connection()
            cursor = conn.cursor()
            query = "SELECT 1 FROM favorites WHERE user_id = ? AND store_id = ? LIMIT 1"
            cursor.execute(query, (user_id, store_id))
            row = cursor.fetchone()
            return row is not None
        except sqlite3.Error as e:
            print(f"[Database Error] FavoriteModel.is_favorite 發生錯誤: {e}")
            return False
        except Exception:
            return False
        finally:
            if conn:
                conn.close()
