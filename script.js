const items = [
    "大腸包小腸",
    "明倫蛋餅",
    "章魚小丸子",
    "地瓜球",
    "麻辣臭豆腐",
    "排骨酥",
    "烤玉米",
    "冰糖葫蘆"
];

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
const modal = document.getElementById("resultModal");
const resultText = document.getElementById("resultText");
const closeModalBtn = document.getElementById("closeModalBtn");

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

function showResult(result) {
    resultText.textContent = result;
    modal.classList.add("show");
}

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove("show");
});

// 初始化
window.addEventListener('load', () => {
    setupCanvas();
});
