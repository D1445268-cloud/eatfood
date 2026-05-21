let items = [];
let storesData = [];

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

    // 計算最終停下的選項
    // 因為轉盤是順時針轉，所以物品索引的順序是逆向計算的
    const numItems = items.length;
    const sliceAngle = 360 / numItems;
    // 將 currentRotation 換算回相對於最上方的角度
    let normalized = (currentRotation % 360);
    if (normalized < 0) normalized += 360;
    
    // 計算指針指到的 index
    // 我們知道旋轉時是把 index 的中心轉到 270 度
    // 反推:
    let index = Math.floor(((270 - normalized + 360) % 360) / sliceAngle);
    
    // 震動回饋 (中獎)
    triggerVibration([100, 50, 100]);

    // 顯示結果
    showResult(items[index]);
});

// 核心：非同步取得店家資料並動態渲染 Modal 內容
async function loadAndShowStoreDetail(storeId) {
    try {
        // 1. 發送 GET 請求向 Flask 獲取詳情
        const response = await fetch(`/api/stores/${storeId}`);
        if (!response.ok) throw new Error("網路請求失敗，無法取得店家資料");
        
        const store = await response.json();

        // 2. 開始動態填入 Modal 內容
        document.getElementById("modalFeaturedImg").src = store.featured_image;
        document.getElementById("modalFeaturedImg").alt = store.name;
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

        // 描述與優惠
        document.getElementById("modalDescription").textContent = store.description;
        document.getElementById("modalSpecialOffer").innerHTML = `出示此轉盤結果畫面，<strong>${store.special_offer}</strong>`;

        // 動態生成推薦必點 (Badges)
        const recommendedContainer = document.getElementById("modalRecommendedItems");
        recommendedContainer.innerHTML = store.recommended_items
            .map(item => `<span class="badge bg-secondary bg-opacity-10 text-dark border p-2 px-3 rounded-3 fs-7">${item}</span>`)
            .join("");

        // 地圖導航按鈕連結
        document.getElementById("modalMapBtn").href = store.google_maps_url;

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
window.addEventListener('load', () => {
    loadStores();
});

// 註冊點擊轉動事件
spinBtn.addEventListener('click', spin);

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
