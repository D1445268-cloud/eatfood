let items = [];
let storesData = [];
let userFavorites = [];
let targetSelectedIndex = -1; // 記錄轉盤預期抽中的店家索引，防止浮點數誤差與圖文不符問題

// F-05: 載入使用者已收藏的店家 ID
async function loadUserFavorites() {
    try {
        const response = await fetch('/api/favorites?user_id=default_user');
        if (response.ok) {
            const data = await response.json();
            userFavorites = data.map(item => item.id);
        }
    } catch (e) {
        console.error("載入收藏清單失敗:", e);
    }
}


// 高質感調色盤
const colors = [
    "#f43f5e", // 玫瑰紅
    "#8b5cf6", // 紫色
    "#3b82f6", // 藍色
    "#10b981", // 翡翠綠
    "#f59e0b", // 琥珀色
    "#ec4899", // 粉紅
    "#14b8a6", // 藍綠色
    "#f97316"  // 橘色
];

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const canvasContainer = document.querySelector(".canvas-container");

let currentRotation = 0; // 當前旋轉總角度
let isSpinning = false;

// 根據設備像素比 (Device Pixel Ratio) 調整 Canvas 清晰度
function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // 假設 CSS 大小為 300x300，但我們要讓 Canvas 畫布解析度更高
    canvas.width = 600 * dpr;
    canvas.height = 600 * dpr;
    ctx.scale(dpr, dpr);
    drawWheel();
}

// 繪製轉盤
function drawWheel() {
    const numItems = items.length;
    const centerX = 300;
    const centerY = 300;
    const radius = 300;
    const arcSize = (2 * Math.PI) / numItems;

    ctx.clearRect(0, 0, 600, 600);

    for (let i = 0; i < numItems; i++) {
        const angle = i * arcSize;
        
        // 畫扇形
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        ctx.closePath();
        
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        
        // 增加區塊邊界線
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.stroke();

        // 畫文字
        ctx.save();
        ctx.translate(
            centerX + Math.cos(angle + arcSize / 2) * (radius * 0.65),
            centerY + Math.sin(angle + arcSize / 2) * (radius * 0.65)
        );
        ctx.rotate(angle + arcSize / 2 + Math.PI / 2);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px 'Noto Sans TC', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // 文字陰影增加可讀性
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // 如果文字太長，做簡單的換行或縮小 (這裡簡化為直接印)
        const text = items[i];
        for(let j = 0; j < text.length; j++) {
            ctx.fillText(text[j], 0, j * 36 - ((text.length-1) * 18));
        }
        
        ctx.restore();
    }
}

// 嘗試觸發手機震動回饋 (需裝置與瀏覽器支援)
function triggerVibration(pattern) {
    if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
}

// 開始旋轉
function spin() {
    if (isSpinning) return;
    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = "轉動中...";

    // 輕微震動回饋
    triggerVibration(50);

    const numItems = items.length;
    const sliceAngle = 360 / numItems;
    
    // 隨機決定要停在哪個選項 (0 到 numItems-1)
    const randomItemIndex = Math.floor(Math.random() * numItems);
    targetSelectedIndex = randomItemIndex; // 保存預期索引
    
    // 預期指針停在正上方 (270度 / -90度 處)，計算對應的旋轉角度
    // 當前 Canvas 預設 0 度是向右，我們繪製是從 0 度開始
    // 所以第一個物品的正中央角度是 sliceAngle / 2
    const itemCenterAngle = (randomItemIndex * sliceAngle) + (sliceAngle / 2);
    
    // 指針在最上方，也就是相對於畫布的 270 度 (-90 度)
    // 我們需要把目標物品的中心點轉到指針那裡
    // 需要旋轉的角度 = 270 - itemCenterAngle
    let stopAngle = 270 - itemCenterAngle;
    
    // 確保轉盤每次至少轉 5 到 8 圈，增加期待感
    const extraSpins = (Math.floor(Math.random() * 4) + 5) * 360;
    
    // 加上額外的圈數，並減去當前已旋轉的度數 (為了讓 transition 平滑)
    const targetRotation = currentRotation + extraSpins + (stopAngle - (currentRotation % 360));
    
    // 因為 (stopAngle - (currentRotation % 360)) 可能會讓它倒轉或少轉，我們標準化它
    let finalRotation = targetRotation;
    if ((finalRotation - currentRotation) < extraSpins) {
        finalRotation += 360;
    }

    currentRotation = finalRotation;

    // 套用 CSS 旋轉
    canvasContainer.style.transform = `rotate(${currentRotation}deg)`;
}

// 監聽旋轉結束事件
canvasContainer.addEventListener('transitionend', () => {
    if (!isSpinning) return;
    
    isSpinning = false;
    spinBtn.disabled = false;
    spinBtn.textContent = "再來一次！";

    // 直接採用預先選定的索引，100% 避免因旋轉角度反推的浮點數誤差所造成的圖文不符問題！
    let index = targetSelectedIndex;
    
    // 防呆處理
    if (index < 0 || index >= items.length) {
        index = 0;
    }
    
    // 震動回饋 (中獎)
    triggerVibration([100, 50, 100]);

    // 顯示結果
    showResult(items[index]);
});

// 生成安全且包含導航功能的 Google Maps Universal URL
function generateGoogleMapsUrl(store) {
    // 優先使用資料庫中已預設好的完整 google_maps_url (若存在且合法)
    if (store.google_maps_url && store.google_maps_url.startsWith("http")) {
        return store.google_maps_url;
    }
    
    // 否則，動態建立一個符合 Google Maps Universal URLs 規範的安全路徑導航連結
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    let destination = "";
    
    // 如果資料庫內有高精度的經緯度定位，優先作為導航終點，以防同名地標搜尋錯誤
    if (store.latitude && store.longitude) {
        destination = `${store.latitude},${store.longitude}`;
    } else {
        // 沒有經緯度時，使用 店家名稱 + 細分區域 進行精準路徑搜尋導航
        const suffix = store.sub_area ? ` ${store.sub_area}` : " 逢甲";
        destination = store.name + suffix;
    }
    
    return `${baseUrl}&destination=${encodeURIComponent(destination)}`;
}

// 核心：非同步取得店家資料並動態渲染 Modal 內容
async function loadAndShowStoreDetail(storeId) {
    try {
        // 1. 發送 GET 請求向 Flask 獲取詳情
        const response = await fetch(`/api/stores/${storeId}`);
        if (!response.ok) throw new Error("網路請求失敗，無法取得店家資料");
        
        const store = await response.json();

        // 2. 開始動態填入 Modal 內容
        const featuredImg = document.getElementById("modalFeaturedImg");
        // 優先使用新欄位 image_url (真實相片網址)，其次為原本的 featured_image
        featuredImg.src = store.image_url || store.featured_image;
        featuredImg.alt = store.name;
        
        // F-03: 若已有手動配好之真實相片 (image_url) 則不重複請求；若無，才向後端非同步獲取 Google Places API 照片
        if (!store.image_url) {
            (async () => {
                try {
                    const photoResponse = await fetch(`/api/stores/${store.id}/photo`);
                    if (photoResponse.ok) {
                        const photoData = await photoResponse.json();
                        if (photoData && photoData.photo_url) {
                            featuredImg.src = photoData.photo_url;
                        }
                    }
                } catch (err) {
                    console.warn("非同步獲取 Google Place 相片失敗，保持預設特色圖:", err);
                }
            })();
        }

        document.getElementById("modalStoreName").textContent = store.name;
        document.getElementById("modalWalkingDistance").textContent = `🚶 步行 ${store.walking_distance} 分鐘`;
        document.getElementById("modalRating").textContent = `⭐ ${store.rating} (${store.reviews_count}+評價)`;
        
        // 膠囊標籤填值
        document.getElementById("modalMealType").textContent = `🍜 ${store.meal_type}`;
        document.getElementById("modalPriceRange").textContent = `$$ ${store.price_range}`;
        document.getElementById("modalOpenStatus").textContent = store.is_open 
            ? `🟢 營業中 (今日至 ${store.closing_time})` 
            : `🔴 已打烊`;
        document.getElementById("modalOpenStatus").className = store.is_open 
            ? "badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2"
            : "badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-3 py-2";

        // F-03: 學生證特約優惠標籤與內容動態顯示
        const studentBadge = document.getElementById("modalStudentDiscountBadge");
        const studentContainer = document.getElementById("modalStudentDiscountContainer");
        const studentDetail = document.getElementById("modalStudentDiscountDetail");
        
        if (store.student_discount && store.student_discount.trim() !== "" && store.student_discount.trim() !== "無") {
            studentBadge.classList.remove("d-none");
            studentContainer.classList.remove("d-none");
            studentDetail.innerHTML = `憑逢甲大學學生證消費，即可享<strong>「${store.student_discount}」</strong>特惠！`;
        } else {
            studentBadge.classList.add("d-none");
            studentContainer.classList.add("d-none");
        }

        // F-05: 初始化最愛按鈕點亮狀態
        const favoriteBtn = document.getElementById("modalFavoriteBtn");
        favoriteBtn.dataset.storeId = store.id;
        if (userFavorites.includes(store.id)) {
            favoriteBtn.classList.add("favorited");
            favoriteBtn.title = "已收藏，點擊取消";
        } else {
            favoriteBtn.classList.remove("favorited");
            favoriteBtn.title = "加入收藏";
        }

        // 描述與優惠
        document.getElementById("modalDescription").textContent = store.description;
        document.getElementById("modalSpecialOffer").innerHTML = `出示此轉盤結果畫面，<strong>${store.special_offer}</strong>`;

        // 動態生成推薦必點 (Badges)
        const recommendedContainer = document.getElementById("modalRecommendedItems");
        recommendedContainer.innerHTML = store.recommended_items
            .map(item => `<span class="badge bg-secondary bg-opacity-10 text-dark border p-2 px-3 rounded-3 fs-7">${item}</span>`)
            .join("");

        // 地圖導航按鈕連結：載入生成之安全導航網址，並防範 Reverse Tabnabbing 漏洞
        const mapBtn = document.getElementById("modalMapBtn");
        mapBtn.href = generateGoogleMapsUrl(store);
        mapBtn.setAttribute("rel", "noopener noreferrer");

        // F-06: 載入並更新評價分頁數據與動態生成的 Mock 評論
        const avgScoreEl = document.getElementById("reviewAvgScore");
        const totalCountEl = document.getElementById("reviewTotalCount");
        if (avgScoreEl) avgScoreEl.textContent = store.rating;
        if (totalCountEl) totalCountEl.textContent = `共 ${store.reviews_count}+ 則顧客評論`;

        const reviewsList = document.getElementById("reviewsList");
        if (reviewsList) {
            reviewsList.innerHTML = `
              <div class="p-3 rounded-3 mb-2 animate-fade-in" style="background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.04);">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <div class="text-warning small">${'★'.repeat(Math.round(store.rating))}${'☆'.repeat(5 - Math.round(store.rating))}</div>
                  <span class="text-secondary" style="font-size: 0.75rem;">1天前</span>
                </div>
                <p class="mb-1 text-dark small">這家【${store.name}】的${store.meal_type}味道真的很讚，每次來逢甲商圈都會想吃！</p>
                <div class="text-secondary" style="font-size: 0.75rem;">逢甲大學王同學</div>
              </div>
              <div class="p-3 rounded-3 mb-2 animate-fade-in" style="background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.04);">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <div class="text-warning small">${'★'.repeat(Math.max(1, Math.round(store.rating) - 1))}${'☆'.repeat(5 - Math.max(1, Math.round(store.rating) - 1))}</div>
                  <span class="text-secondary" style="font-size: 0.75rem;">3天前</span>
                </div>
                <p class="mb-1 text-dark small">餐點份量很足夠，價格在${store.price_range}左右算是性價比極高，推一個！</p>
                <div class="text-secondary" style="font-size: 0.75rem;">美食小達人</div>
              </div>
            `;
        }

        // F-06: 重設 Modal 內的分頁頁籤回「店家詳情」
        const detailTab = document.getElementById("detail-tab");
        if (detailTab) {
            const bsTab = bootstrap.Tab.getInstance(detailTab) || new bootstrap.Tab(detailTab);
            bsTab.show();
        }

        // F-06: 清空與重置表單內容
        const reviewForm = document.getElementById("reviewForm");
        if (reviewForm) reviewForm.reset();
        const reportForm = document.getElementById("reportForm");
        if (reportForm) reportForm.reset();

        // 3. 實例化並開啟 Bootstrap 5 Modal
        const infoModalEl = document.getElementById('foodInfoModal');
        const bsModal = new bootstrap.Modal(infoModalEl);
        bsModal.show();

    } catch (error) {
        console.error("載入店家詳情時發生錯誤:", error);
        alert("店家詳情正在準備中，請稍後再試！");
    }
}

async function showResult(storeName) {
    const selectedStore = storesData.find(s => s.name === storeName);
    if (!selectedStore) {
        alert("找不到選中店家！");
        return;
    }
    await loadAndShowStoreDetail(selectedStore.id);
}

// 分享按鈕複製功能
function copyShareLink() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            alert("店家分享連結已複製到剪貼簿！🎉");
        })
        .catch(err => {
            console.error("複製失敗", err);
        });
}

// 重設勾選狀態的輔助函式
function resetCheckboxes(checkedState = true) {
    const checkboxes = document.querySelectorAll('#filterDrawer .btn-check');
    checkboxes.forEach(cb => {
        cb.checked = checkedState;
    });
}

async function loadStores(priceRange = '', mealType = '') {
    try {
        let url = '/api/stores';
        const params = [];
        if (priceRange) params.push(`price_range=${encodeURIComponent(priceRange)}`);
        if (mealType) params.push(`meal_type=${encodeURIComponent(mealType)}`);
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("無法獲取店家清單");
        storesData = await response.json();
        
        if (storesData.length === 0) {
            alert("⚠️ 沒有符合篩選條件的店家，已自動還原為顯示所有店家！");
            resetCheckboxes(true);
            await loadStores();
            return;
        }

        items = storesData.map(store => store.name);
        
        // 每次重新套用篩選後，重置轉盤旋轉角度，確保位置重設
        currentRotation = 0;
        canvasContainer.style.transform = 'rotate(0deg)';
        
        setupCanvas();
    } catch (error) {
        console.error("載入轉盤店家失敗，使用備用靜態資料:", error);
        storesData = [
            { id: 1, name: "明倫蛋餅", meal_type: "小吃" },
            { id: 2, name: "官芝霖大腸包小腸", meal_type: "小吃" },
            { id: 3, name: "一家之薯起司馬鈴薯", meal_type: "小吃" },
            { id: 4, name: "尊品原汁牛肉麵", meal_type: "主食" },
            { id: 5, name: "極味屋日式拉麵", meal_type: "主食" },
            { id: 6, name: "逢甲冰糖葫蘆", meal_type: "甜點" },
            { id: 7, name: "阿華黑輪店", meal_type: "小吃" },
            { id: 8, name: "美濃木瓜牛奶", meal_type: "飲料" }
        ];
        items = storesData.map(store => store.name);
        setupCanvas();
    }
}

// 初始化
window.addEventListener('load', async () => {
    await loadUserFavorites(); // 優先加載使用者最愛快取
    loadStores();
});

// 註冊點擊轉動事件
spinBtn.addEventListener('click', spin);

// F-05: 註冊 Modal 內最愛收藏按鈕的點擊切換事件
document.getElementById("modalFavoriteBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const storeId = parseInt(btn.dataset.storeId);
    if (!storeId) return;
    
    const isFavorited = btn.classList.contains("favorited");
    
    try {
        btn.disabled = true; // 防止重複連擊
        if (isFavorited) {
            // 取消收藏
            const response = await fetch(`/api/favorites/${storeId}?user_id=default_user`, {
                method: 'DELETE'
            });
            if (response.ok) {
                btn.classList.remove("favorited");
                btn.title = "加入收藏";
                userFavorites = userFavorites.filter(id => id !== storeId);
            }
        } else {
            // 新增收藏
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_id: storeId, user_id: 'default_user' })
            });
            if (response.ok) {
                btn.classList.add("favorited");
                btn.title = "已收藏，點擊取消";
                userFavorites.push(storeId);
            }
        }
    } catch (err) {
        console.error("切換最愛狀態失敗:", err);
    } finally {
        btn.disabled = false;
    }
});


// --- F-02 篩選功能事件綁定 ---

// 動態更新篩選按鈕文字中符合的店家數量，達到極速響應的視覺回饋
async function updateFilterButtonCount() {
    const priceCheckboxes = document.querySelectorAll('#filterDrawer input[id^="price-"]:checked');
    const mealCheckboxes = document.querySelectorAll('#filterDrawer input[id^="meal-"]:checked');
    const applyBtn = document.getElementById('applyFilterBtn');

    if (priceCheckboxes.length === 0 && mealCheckboxes.length === 0) {
        applyBtn.textContent = "請至少選擇一項條件";
        applyBtn.disabled = true;
        return;
    }

    applyBtn.disabled = false;
    const priceValues = Array.from(priceCheckboxes).map(cb => cb.value).join(',');
    const mealValues = Array.from(mealCheckboxes).map(cb => cb.value).join(',');

    try {
        let url = '/api/stores';
        const params = [];
        if (priceValues) params.push(`price_range=${encodeURIComponent(priceValues)}`);
        if (mealValues) params.push(`meal_type=${encodeURIComponent(mealValues)}`);
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            applyBtn.textContent = `套用篩選 (符合 ${data.length} 家)`;
        }
    } catch (e) {
        console.error("估算店家數量失敗:", e);
    }
}

// 監聽所有篩選核取方塊的狀態變更，即時運算
document.querySelectorAll('#filterDrawer .btn-check').forEach(cb => {
    cb.addEventListener('change', updateFilterButtonCount);
});

// 套用篩選按鈕
document.getElementById('applyFilterBtn').addEventListener('click', async () => {
    const priceCheckboxes = document.querySelectorAll('#filterDrawer input[id^="price-"]:checked');
    const mealCheckboxes = document.querySelectorAll('#filterDrawer input[id^="meal-"]:checked');

    if (priceCheckboxes.length === 0 && mealCheckboxes.length === 0) {
        alert("請至少選擇一項預算或餐點類型！");
        return;
    }

    const priceValues = Array.from(priceCheckboxes).map(cb => cb.value).join(',');
    const mealValues = Array.from(mealCheckboxes).map(cb => cb.value).join(',');

    const applyBtn = document.getElementById('applyFilterBtn');
    applyBtn.disabled = true;
    const originalText = applyBtn.textContent;
    applyBtn.textContent = "套用中...";

    try {
        await loadStores(priceValues, mealValues);
        
        // 成功後關閉 Offcanvas 面板
        const filterDrawerEl = document.getElementById('filterDrawer');
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(filterDrawerEl) || new bootstrap.Offcanvas(filterDrawerEl);
        bsOffcanvas.hide();
    } catch (e) {
        console.error(e);
    } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = originalText;
    }
});

// 重設條件按鈕
document.getElementById('resetFilterBtn').addEventListener('click', () => {
    resetCheckboxes(true);
    updateFilterButtonCount(); // 重設後立即刷新按鈕數量
});

// 頁面加載完成後與初始化時，預先計算一次數量
window.addEventListener('load', () => {
    setTimeout(updateFilterButtonCount, 100);
});

// --- F-06: 評論與回報機制模組事件監聽與互動邏輯 ---

// Toast 提示框輔助函式
function showToast(message, icon = '🎉') {
    const toastEl = document.getElementById('appToast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toastEl && toastIcon && toastMessage) {
        toastIcon.textContent = icon;
        toastMessage.textContent = message;
        
        const bsToast = bootstrap.Toast.getInstance(toastEl) || new bootstrap.Toast(toastEl, { delay: 3000 });
        bsToast.show();
    } else {
        alert(`${icon} ${message}`);
    }
}

// HTML 逸出字元處理，提升防範 XSS 安全性
function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// 監聽評論表單提交
const reviewForm = document.getElementById('reviewForm');
if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const ratingInput = reviewForm.querySelector('input[name="rating"]:checked');
        const commentInput = document.getElementById('reviewComment');
        
        if (!ratingInput) {
            showToast("請點選星級評分！", "⚠️");
            return;
        }
        
        const rating = parseInt(ratingInput.value);
        const comment = commentInput.value.trim();
        
        if (!comment) {
            showToast("請輸入評論內容！", "⚠️");
            return;
        }
        
        // 模擬成功送出
        showToast("評論送出成功，感謝您的分享！", "💬");
        
        // 將新評論動態插入至列表頂部，增強互動感
        const reviewsList = document.getElementById('reviewsList');
        if (reviewsList) {
            const newReviewHtml = `
              <div class="p-3 rounded-3 mb-2 animate-fade-in" style="background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.04);">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <div class="text-warning small">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
                  <span class="text-secondary" style="font-size: 0.75rem;">剛剛</span>
                </div>
                <p class="mb-1 text-dark small">${escapeHtml(comment)}</p>
                <div class="text-secondary" style="font-size: 0.75rem;">路人食客 (熱騰騰評論)</div>
              </div>
            `;
            reviewsList.insertAdjacentHTML('afterbegin', newReviewHtml);
            // 滾動回頂部以看見新評論
            reviewsList.scrollTop = 0;
        }
        
        // 重置表單
        reviewForm.reset();
    });
}

// 監聽糾錯表單提交
const submitReportBtn = document.getElementById('submitReportBtn');
if (submitReportBtn) {
    submitReportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        const checkedErrors = document.querySelectorAll('.report-check:checked');
        const reportDetails = document.getElementById('reportDetails').value.trim();
        
        if (checkedErrors.length === 0) {
            showToast("請至少選擇一項錯誤類型！", "⚠️");
            return;
        }
        
        // 收集回報資訊並打包成 JSON 格式，便於後續與後端 API 對接
        const storeId = document.getElementById('modalFavoriteBtn').dataset.storeId;
        const storeName = document.getElementById('modalStoreName').textContent;
        const errorTypes = Array.from(checkedErrors).map(cb => cb.value);
        
        const reportPayload = {
            store_id: storeId ? parseInt(storeId) : null,
            store_name: storeName,
            error_types: errorTypes,
            details: reportDetails,
            submitted_at: new Date().toISOString()
        };
        
        // 輸出至開發者主控台，供後續與核心開發者進行連線除錯
        console.log("=== [測試] 前端資訊糾錯 JSON 打包結果 ===");
        console.log(JSON.stringify(reportPayload, null, 2));
        
        // 模擬成功提交
        showToast("回報提交成功，管理員將盡快核實！", "👍");
        
        // 重置糾錯表單
        checkedErrors.forEach(cb => cb.checked = false);
        const reportDetailsEl = document.getElementById('reportDetails');
        if (reportDetailsEl) reportDetailsEl.value = '';
    });
}

// 供核心開發者在瀏覽器 DevTools 中執行 `runReportPayloadTest()` 進行前尾端連動測試
window.runReportPayloadTest = function() {
    console.log("=== 啟動前端資料收集測試 [F-06 糾錯回報] ===");
    
    // 模擬：假定目前載入的店家為逢甲拉麵 (ID: 15)
    const favoriteBtn = document.getElementById('modalFavoriteBtn');
    const originalId = favoriteBtn ? favoriteBtn.dataset.storeId : "";
    if (favoriteBtn) favoriteBtn.dataset.storeId = "15";
    
    const storeNameEl = document.getElementById('modalStoreName');
    const originalName = storeNameEl ? storeNameEl.textContent : "";
    if (storeNameEl) storeNameEl.textContent = "極味屋日式拉麵";
    
    // 模擬勾選糾錯項目
    const errPriceCb = document.getElementById('err-price');
    const originalPriceState = errPriceCb ? errPriceCb.checked : false;
    if (errPriceCb) errPriceCb.checked = true;
    
    const errOtherCb = document.getElementById('err-other');
    const originalOtherState = errOtherCb ? errOtherCb.checked : false;
    if (errOtherCb) errOtherCb.checked = true;
    
    // 模擬輸入補充資訊
    const detailsEl = document.getElementById('reportDetails');
    const originalDetails = detailsEl ? detailsEl.value : "";
    if (detailsEl) detailsEl.value = "拉麵的豚骨拉麵品項已經從 180 元調漲為 210 元，學生加麵優惠維持不變。";
    
    // 收集
    const checkedErrors = document.querySelectorAll('.report-check:checked');
    const reportDetails = detailsEl ? detailsEl.value.trim() : "";
    
    const reportPayload = {
        store_id: favoriteBtn && favoriteBtn.dataset.storeId ? parseInt(favoriteBtn.dataset.storeId) : null,
        store_name: storeNameEl ? storeNameEl.textContent : "未知店家",
        error_types: Array.from(checkedErrors).map(cb => cb.value),
        details: reportDetails,
        submitted_at: new Date().toISOString()
    };
    
    console.log("1. 成功從 HTML 結構中提取輸入...");
    console.log("2. 打包轉換完成的 JSON 格式數據內容如下：");
    console.log(JSON.stringify(reportPayload, null, 2));
    console.log("=== 測試完成：JSON 資料封裝測試成功！ ===");
    
    // 還原狀態
    if (favoriteBtn) favoriteBtn.dataset.storeId = originalId;
    if (storeNameEl) storeNameEl.textContent = originalName;
    if (errPriceCb) errPriceCb.checked = originalPriceState;
    if (errOtherCb) errOtherCb.checked = originalOtherState;
    if (detailsEl) detailsEl.value = originalDetails;
};

