# -*- coding: utf-8 -*-
import datetime
from flask import Blueprint, jsonify, abort, request
from app.models.store import StoreModel

store_bp = Blueprint('store', __name__)

def parse_business_status(opening_hours_str, off_days_str):
    """
    動態解析店家的營業時間與公休日，判斷目前是否營業中。
    回傳: (is_open: bool, closing_time: str)
    """
    now = datetime.datetime.now()
    
    # 1. 檢查是否為公休日
    weekdays_tc = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
    current_weekday = weekdays_tc[now.weekday()]
    
    if off_days_str and current_weekday in off_days_str:
        return False, "今日公休"
        
    # 2. 如果沒有設定營業時間，預設營業
    if not opening_hours_str or opening_hours_str.strip() == "":
        return True, "23:00"
        
    # 3. 檢查目前時間是否在任何營業時段內
    current_time_str = now.strftime("%H:%M")
    current_time = datetime.datetime.strptime(current_time_str, "%H:%M").time()
    
    # 分割營業時段，例如 "11:30-14:00;17:00-21:30"
    periods = [p.strip() for p in opening_hours_str.split(';') if p.strip()]
    
    is_open = False
    matching_closing_time = "22:00"
    
    for period in periods:
        if '-' not in period:
            continue
        try:
            start_str, end_str = period.split('-')
            start_time = datetime.datetime.strptime(start_str.strip(), "%H:%M").time()
            end_time = datetime.datetime.strptime(end_str.strip(), "%H:%M").time()
            
            # 判斷是否為跨午夜營業，例如 "17:00-02:00"
            if start_time <= end_time:
                # 正常時段
                if start_time <= current_time <= end_time:
                    is_open = True
                    matching_closing_time = end_str.strip()
                    break
            else:
                # 跨午夜時段
                if current_time >= start_time or current_time <= end_time:
                    is_open = True
                    matching_closing_time = end_str.strip()
                    break
        except Exception:
            continue
            
    # 如果沒在任何時段內，看最晚營業時段的結束時間作為參考
    if not is_open and periods:
        try:
            last_period = periods[-1]
            if '-' in last_period:
                matching_closing_time = last_period.split('-')[1].strip()
        except Exception:
            pass
            
    return is_open, matching_closing_time

@store_bp.route('/api/stores', methods=['GET'])
def get_stores():
    """取得店家清單，支援價格與類型多條件篩選 (F-02)"""
    try:
        # 獲取篩選參數（逗號分隔字串，如 ?price_range=$,$$&meal_type=小吃,主食）
        price_range_arg = request.args.get('price_range')
        meal_type_arg = request.args.get('meal_type')
        
        price_ranges = price_range_arg.split(',') if price_range_arg else None
        meal_types = meal_type_arg.split(',') if meal_type_arg else None
        
        # 呼叫多選篩選查詢方法
        stores = StoreModel.get_filtered(price_ranges, meal_types)
        
        # 僅回傳基本欄位以節省網路流量
        simplified_stores = [
            {
                "id": s["id"],
                "name": s["name"],
                "meal_type": s["meal_type"] or "小吃"
            }
            for s in stores
        ]
        return jsonify(simplified_stores)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@store_bp.route('/api/stores/<int:store_id>', methods=['GET'])
def get_store_detail(store_id):
    """取得特定店家的完整詳細資料，用於美食情報卡展示 (解耦硬編碼，全新動態讀取)"""
    try:
        store = StoreModel.get_by_id(store_id)
        if not store:
            abort(404, description="Store not found")

        # 1. 智慧營業時間判斷
        is_open, closing_time = parse_business_status(
            store.get("opening_hours"), 
            store.get("off_days")
        )

        # 2. 解析必點推薦餐點 (分號分隔)
        rec_str = store.get("recommended_items")
        if rec_str:
            recommended_items = [x.strip() for x in rec_str.split(';') if x.strip()]
        else:
            recommended_items = ["招牌主打美食 ($100)", "精選必點套餐 ($150)", "冷泡茶 ($30)"]

        # 3. 豐富化資料回傳，優先取自資料庫，若空則提供動態擬真兜底值
        detail_data = {
            "id": store["id"],
            "name": store["name"],
            "price_range": store.get("price_range") or "$",
            "meal_type": store.get("meal_type") or "小吃",
            "walking_distance": store.get("walking_distance") or 3,
            "google_maps_url": store.get("google_maps_url") or "https://www.google.com/maps",
            
            # 資料庫新欄位對接
            "description": store.get("description") or "逢甲夜市人氣精選，獨特風味令人回味無窮！",
            "rating": store.get("rating") or 4.5,
            "reviews_count": store.get("reviews_count") or (150 + store["id"] * 24),
            "is_open": is_open,
            "closing_time": closing_time,
            "special_offer": store.get("special_offer") or "憑本轉盤結果畫面，可享該店九折特惠！",
            "featured_image": store.get("featured_image") or "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
            "recommended_items": recommended_items,
            
            # 其他擴充欄位 (供未來前端升級使用)
            "avg_price": store.get("avg_price"),
            "sub_area": store.get("sub_area"),
            "student_discount": store.get("student_discount"),
            "dining_scenario": store.get("dining_scenario")
        }
        
        return jsonify(detail_data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
