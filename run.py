# -*- coding: utf-8 -*-
"""
啟動腳本 (run.py)
此腳本為與舊版相容之入口點，動態載入根目錄的 app.py 核心初始化模組，並啟動開發伺服器。
建議開發時可直接執行: python app.py
"""
import os
import sys
import importlib.util

# 確保專案根目錄在搜尋路徑中
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 動態載入同級目錄的 app.py 核心模組，避免與 app/ 包資料夾衝突
spec = importlib.util.spec_from_file_location(
    "app_core", 
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py")
)
app_core = importlib.util.module_from_spec(spec)
sys.modules["app_core"] = app_core
spec.loader.exec_module(app_core)

app = app_core.app
init_db = app_core.init_db

if __name__ == '__main__':
    # 啟動前初始化資料庫 (包含 Schema 更新與 CSV 測試資料匯入)
    init_db()
    # 啟動 Flask 開發伺服器
    app.run(debug=True, port=5000)
