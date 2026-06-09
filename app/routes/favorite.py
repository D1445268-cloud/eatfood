# -*- coding: utf-8 -*-
from flask import Blueprint, jsonify, request, abort
from app.models.favorite import FavoriteModel

favorite_bp = Blueprint('favorite', __name__)

@favorite_bp.route('/api/favorites', methods=['GET'])
def get_favorites():
    """取得當前使用者的收藏店家清單 (F-05)"""
    try:
        # 支援多使用者，若前端無傳入 user_id 則預設為 default_user
        user_id = request.args.get('user_id', 'default_user')
        favorites = FavoriteModel.get_by_user(user_id)
        
        # 僅回傳基本或前端需要的欄位
        simplified_favorites = [
            {
                "id": s["id"],
                "name": s["name"],
                "price_range": s.get("price_range") or "$",
                "meal_type": s.get("meal_type") or "小吃",
                "walking_distance": s.get("walking_distance") or 3,
                "rating": s.get("rating") or 4.5,
                "featured_image": s.get("featured_image") or "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
                "favorited_at": s["favorited_at"]
            }
            for s in favorites
        ]
        return jsonify(simplified_favorites)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@favorite_bp.route('/api/favorites', methods=['POST'])
def add_favorite():
    """新增店家至我的最愛 (F-05)"""
    try:
        data = request.get_json() or {}
        store_id = data.get('store_id')
        user_id = data.get('user_id', 'default_user')
        
        if not store_id:
            return jsonify({"status": "error", "message": "必須提供 store_id 欄位"}), 400
            
        try:
            store_id = int(store_id)
        except ValueError:
            return jsonify({"status": "error", "message": "store_id 必須是整數"}), 400
            
        success, result = FavoriteModel.add(user_id, store_id)
        if success:
            return jsonify({
                "status": "success", 
                "message": "已成功將店家加入最愛",
                "favorite_id": result
            }), 201
        else:
            # 重複收藏或其他錯誤
            return jsonify({"status": "error", "message": result}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@favorite_bp.route('/api/favorites/<int:store_id>', methods=['DELETE'])
def delete_favorite(store_id):
    """將店家從最愛中移除 (F-05)"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        
        # 也可從 JSON body 讀取（雙重防護以防前端串接習慣不同）
        if request.is_json:
            data = request.get_json() or {}
            user_id = data.get('user_id', user_id)
            
        success = FavoriteModel.remove(user_id, store_id)
        if success:
            return jsonify({"status": "success", "message": "已成功將店家移出最愛"}), 200
        else:
            return jsonify({"status": "error", "message": "此店家未被收藏或移除失敗"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
