# 技術筆記與經驗

本文件記錄開發過程中遇到的重要技術問題、解決方案和經驗教訓。

## 移動流暢度：線性插值 vs 指數插值

### 問題描述
實作碰撞效果後，玩家移動出現明顯卡頓，有「一格一格跳動」的感覺。怪物移動卻很平滑。

### 問題分析

#### 為什麼怪物移動平滑？
怪物使用**連續移動**：
```javascript
// 每幀都移動一小段距離
e.x += Math.cos(angle) * ENEMY_SPEED;  // ENEMY_SPEED = 1.2 像素/幀
e.y += Math.sin(angle) * ENEMY_SPEED;
```
- 每幀移動 1.2 像素
- 純連續移動，沒有網格跳躍
- 不使用插值，所以沒有插值問題

#### 為什麼玩家移動卡頓？
玩家使用**網格移動 + 插值平滑化**：
- 邏輯位置（`x, y`）每 120ms 跳動一格（40 像素）
- 視覺位置（`renderX, renderY`）使用插值平滑過渡

**問題在於使用了指數插值**：
```javascript
// ❌ 錯誤：指數插值
s.renderX += (targetX - renderX) * lerpSpeed;  // lerpSpeed = 0.5
```

指數插值的特性：
- 前幾幀移動很快（第 1 幀移動 50%，第 2 幀移動 25%，第 3 幀移動 12.5%...）
- 越接近目標越慢
- 可能在 40-60ms 就完成 95% 的移動
- 剩下 60-80ms 幾乎靜止（只移動最後的 5%）
- 造成「快速移動 → 停頓 → 快速移動」的循環

### 解決方案：線性插值

使用**線性插值**（Linear Interpolation）：
```javascript
// ✅ 正確：線性插值
const moveProgress = Math.min(timeSinceMove / currentMoveSpeed, 1); // 0.0 到 1.0
s.renderX = s.startRenderX + (s.targetRenderX - s.startRenderX) * moveProgress;
s.renderY = s.startRenderY + (s.targetRenderY - s.startRenderY) * moveProgress;
```

線性插值的特性：
- 移動速度恆定
- 0ms 時在起點（`startRenderX`）
- 120ms 時正好到達終點（`targetRenderX`）
- 在整個移動間隔內均勻移動
- **沒有停頓感**

### 關鍵實作細節

#### 1. 記錄插值起點
在 `moveSnake` 中，當邏輯位置更新時：
```javascript
// 記錄插值起點（當前的視覺位置）
s.startRenderX = s.renderX;
s.startRenderY = s.renderY;
// 設置新的目標位置（新的邏輯位置）
s.targetRenderX = s.x;
s.targetRenderY = s.y;
```

#### 2. 在 gameLoop 中每幀執行插值
```javascript
// 計算時間進度（0.0 到 1.0）
const timeSinceMove = timestamp - lastMoveTime;
const moveProgress = Math.min(timeSinceMove / currentMoveSpeed, 1);

// 根據時間進度計算位置
snake.forEach(s => {
    s.renderX = s.startRenderX + (s.targetRenderX - s.startRenderX) * moveProgress;
    s.renderY = s.startRenderY + (s.targetRenderY - s.startRenderY) * moveProgress;
});
```

#### 3. 初始化正確性
在 `startGame` 中確保初始化：
```javascript
snake = [{
    x: startX,
    y: startY,
    renderX: startX,      // 視覺位置
    renderY: startY,
    targetRenderX: startX, // 目標位置
    targetRenderY: startY,
    startRenderX: startX,  // 插值起點
    startRenderY: startY,
    // ...
}];
```

### 常見錯誤

❌ **錯誤 1：在 moveSnake 中重置 renderX/Y**
```javascript
// 這會導致視覺位置直接跳到新位置，沒有插值
s.renderX = prevPositions[i].x;
s.renderY = prevPositions[i].y;
```

❌ **錯誤 2：使用指數插值**
```javascript
// 這會導致移動速度不均勻，產生停頓感
s.renderX += (targetX - renderX) * lerpSpeed;
```

❌ **錯誤 3：不記錄起始位置**
```javascript
// 這會導致插值計算錯誤，無法準確預測到達時間
s.targetRenderX = s.x; // 只設置目標，沒有起點
```

✅ **正確做法：線性插值 + 記錄起點**
```javascript
// 在 moveSnake 中
s.startRenderX = s.renderX;  // 記錄起點
s.targetRenderX = s.x;       // 設置目標

// 在 gameLoop 中
const progress = timeSinceMove / moveSpeed;
s.renderX = s.startRenderX + (s.targetRenderX - s.startRenderX) * progress;
```

### 調試技巧

1. **檢查插值是否在執行**：
   - 在 gameLoop 中輸出 `renderX` 和 `targetRenderX`
   - 確認 `renderX` 是否每幀都在變化

2. **檢查移動速度**：
   - 輸出 `moveProgress`，確認是否從 0 到 1
   - 確認 `timeSinceMove` 是否正確累積

3. **檢查初始化**：
   - 確認 `startRenderX` 是否正確記錄
   - 確認所有屬性都有初始值

### 性能考量

- **將狀態更新移到邏輯階段**：
  - `hitTimer`、`stunTimer` 等計時器在邏輯更新階段更新
  - 繪製階段只讀取狀態，不修改
  - 避免在繪製時更新狀態，提升性能

- **回彈效果優化**：
  - 使用衰減係數（0.95）讓回彈快速消失
  - 回彈力度降低（0.3）減少對移動的影響
  - 確保回彈不干擾正常移動

## Canvas 座標轉換

### 問題描述
滑鼠拖曳時，軌跡線段出現在滑鼠下方約 136px 的位置。

### 原因
- Canvas 有 `margin-top: 136px`（HUD 區域高度）
- 滑鼠的 `clientX` 和 `clientY` 是相對於整個視窗的座標
- 但 Canvas 的座標系統是從 Canvas 左上角開始的

### 解決方案
使用 `getBoundingClientRect()` 轉換座標：

```javascript
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener("mousemove", (e) => {
    const coords = getCanvasCoordinates(e);
    addTrailPoint(coords.x, coords.y);
});
```

**關鍵點**：
- `rect.left` 和 `rect.top` 是 Canvas 相對於視窗的位置
- 減去這些值得到 Canvas 內部的相對座標
- 觸控事件也需要相同的處理

## 升級系統配置技巧

### 負數 increment 的顯示處理
移動速度升級使用負數 increment（減少移動間隔）：

```javascript
// upgrade-config.js
moveSpeed: {
    name: "移動速度",
    description: "隊長移動速度提升（移動間隔減少 {value} 毫秒）",
    baseValue: 200,
    increment: -15,  // 負數！
}
```

顯示時需要處理：
```javascript
// 對於負數 increment，顯示絕對值
const displayValue = Math.abs(option.upgrade.increment || 1);
let descText = option.upgrade.description.replace("{value}", displayValue);
```

## 配置文件設計模式

所有配置文件使用相同的模式：

```javascript
// xxx-config.js
window.XXX_CONFIG = {
    // 配置內容
};
```

**優點**：
- 企劃人員可直接編輯，無需懂程式
- 使用 `window.XXX_CONFIG` 作為全域變數
- 在 `index.html` 中載入：`<script src="xxx-config.js"></script>`
- 在 `script.js` 中使用：`window.XXX_CONFIG`

**現有配置文件**：
- `guide-config.js`：遊戲說明
- `upgrade-config.js`：升級系統
- `enemy-spawn-config.js`：怪物生成
- `hero-quotes-config.js`：勇者今日名言

## UI 布局設計

### 頂部 HUD 區域
使用獨立區域，不遮擋遊戲：

```css
.hud-top-bar {
    position: absolute;
    top: 0;
    width: 100%;
    height: 136px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(4px);
}

canvas#gameCanvas {
    margin-top: 136px;
    height: calc(100% - 136px);
}
```

**優點**：
- HUD 與遊戲區域分離
- 遊戲區域不被遮擋
- 視覺更清晰

### 響應式設計
使用 Flexbox 自動排列：
```css
.hud-top-bar {
    display: flex;
    gap: 12px;
}

.minimap-container {
    width: 120px;
    flex-shrink: 0;  /* 不縮小 */
}

.top-stats {
    flex: 1;  /* 佔據剩餘空間 */
    min-width: 0;  /* 允許縮小 */
}
```

## 效能優化原則

1. **邏輯與繪製分離**：
   - 邏輯更新在固定間隔（120ms）
   - 繪製在每幀（~16ms @ 60fps）
   - 插值在每幀執行，讓視覺平滑

2. **狀態更新在邏輯階段**：
   - 計時器（`hitTimer`, `stunTimer`）在邏輯更新
   - 繪製階段只讀取，不修改
   - 避免在繪製循環中更新狀態

3. **視覺效果不影響邏輯**：
   - 回彈效果只影響 `renderX/Y`
   - 不影響邏輯位置（`x, y`）
   - 確保遊戲邏輯一致性
