# -*- coding: utf-8 -*-
from flask import Blueprint, jsonify, abort, request
from app.models.store import StoreModel

store_bp = Blueprint('store', __name__)

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
    """取得特定店家的完整詳細資料，用於美食情報卡展示"""
    try:
        store = StoreModel.get_by_id(store_id)
        if not store:
            abort(404, description="Store not found")

        # 豐富化的資料回傳，結合資料庫欄位與高階 UI 元件所需的特約與特色欄位
        # 針對特約優惠、照片等，我們根據店家名稱來提供擬真的特色內容，提升卡片吸引力！
        name = store["name"]
        
        # 依店名分配擬真的特約優惠與美食照片
        special_offers = {
            "明倫蛋餅": "出示本轉盤結果，第二份現折 10 元！",
            "官芝霖大腸包小腸": "憑轉盤畫面，點大份享免費升級蒜味加量！",
            "一家之薯起司馬鈴薯": "出示轉盤，任選配料多送一份 (價值 15 元)！",
            "尊品原汁牛肉麵": "憑轉盤畫面，內用免費贈送小菜一盤！",
            "極味屋日式拉麵": "出示轉盤，點拉麵享「免費加麵一次」或送「溫泉蛋乙顆」！",
            "逢甲冰糖葫蘆": "憑轉盤畫面，買三串送一串！",
            "阿華黑輪店": "出示轉盤，消費滿百送特製貢丸一顆！",
            "美濃木瓜牛奶": "憑轉盤畫面，大杯限時折抵 5 元！"
        }
        
        images = {
            "明倫蛋餅": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
            "官芝霖大腸包小腸": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80",
            "一家之薯起司馬鈴薯": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
            "尊品原汁牛肉麵": "https://images.unsplash.com/photo-1547928576-a4a33237ecd3?auto=format&fit=crop&w=800&q=80",
            "極味屋日式拉麵": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
            "逢甲冰糖葫蘆": "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80",
            "阿華黑輪店": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80",
            "美濃木瓜牛奶": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80"
        }

        descriptions = {
            "明倫蛋餅": "皮薄 Q 彈、蛋香四溢，搭配獨特甜辣醬，是逢甲不可錯過的經典古早味！",
            "官芝霖大腸包小腸": "炭烤米腸外焦內軟，包入紮實多汁的香腸與酸菜、配料，滋味豐富多層次！",
            "一家之薯起司馬鈴薯": "整顆現蒸馬鈴薯搗碎，淋上濃郁滾燙的起司醬，每一口都是滿滿的療癒幸福感！",
            "尊品原汁牛肉麵": "慢火細熬的原汁牛肉湯，牛肉大塊且軟嫩入味，手工麵條勁道十足！",
            "極味屋日式拉麵": "正宗豚骨湯頭慢火熬煮 12 小時，特製細麵吸收滿滿湯頭精華，叉燒肥美炙燒香氣逼人！",
            "逢甲冰糖葫蘆": "香甜清脆的冰糖外衣包裹新鮮草莓與番茄夾蜜餞，酸甜交織的完美童年滋味！",
            "阿華黑輪店": "柴魚高湯清甜無負擔，各式新鮮手工黑輪、蔬菜入味十足，沾上特製甜辣醬超對味！",
            "美濃木瓜牛奶": "精選熟透在地木瓜與香濃鮮乳黃金比例現榨，口感滑順濃郁，消暑解膩首選！"
        }

        recommended_menus = {
            "明倫蛋餅": ["經典蛋餅 (雙蛋) ($50)", "起司蛋餅 ($55)", "紅茶 ($20)"],
            "官芝霖大腸包小腸": ["原味大腸包小腸 ($65)", "蒜味大腸包小腸 ($65)", "辣味大腸包小腸 ($65)"],
            "一家之薯起司馬鈴薯": ["綜合起司馬鈴薯 ($80)", "燻雞起司馬鈴薯 ($85)", "培根起司馬鈴薯 ($80)"],
            "尊品原汁牛肉麵": ["半筋半肉牛肉麵 ($180)", "原汁牛肉麵 ($150)", "招牌滷花干 ($40)"],
            "極味屋日式拉麵": ["特濃黑蒜油拉麵 ($200)", "黃金起司叉燒丼 ($120)", "日式唐揚雞 ($80)"],
            "逢甲冰糖葫蘆": ["經典草莓糖葫蘆 ($60)", "番茄蜜餞糖葫蘆 ($50)", "綜合水果糖葫蘆 ($55)"],
            "阿華黑輪店": ["手工黑輪 ($15)", "高麗菜捲 ($30)", "香滷蘿蔔 ($20)"],
            "美濃木瓜牛奶": ["招牌木瓜牛奶 ($65)", "綠豆沙牛奶 ($60)", "西瓜汁 ($40)"]
        }

        # 組合完整的加值資料
        detail_data = {
            "id": store["id"],
            "name": store["name"],
            "price_range": store["price_range"] or "$",
            "meal_type": store["meal_type"] or "美味小吃",
            "walking_distance": store["walking_distance"] or 3,
            "google_maps_url": store["google_maps_url"] or "https://www.google.com/maps",
            
            # 以下為豐富視覺的特約與體驗資料
            "description": descriptions.get(name, "逢甲夜市人氣精選，獨特風味令人回味無窮！"),
            "rating": 4.7 if store["id"] % 2 == 0 else 4.8,
            "reviews_count": 120 + (store["id"] * 88),
            "is_open": True,  # 模擬今日營業狀態
            "closing_time": "23:00" if store["id"] % 2 == 0 else "22:00",
            "special_offer": special_offers.get(name, "憑本轉盤結果畫面，可享該店九折優惠！"),
            "featured_image": images.get(name, "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"),
            "recommended_items": recommended_menus.get(name, ["主廚招牌料理 ($150)", "經典小菜 ($40)", "消暑飲品 ($35)"])
        }
        
        return jsonify(detail_data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
