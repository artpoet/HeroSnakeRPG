# 技術筆記與經驗

本文件記錄開發過程中遇到的重要技術問題、解決方案和經驗教訓。

## 🤖 AI 導讀與開發注意事項 (AI Context & Pitfalls)

**給未來的 AI 開發者**：本專案是基於 HTML5 Canvas 的輕量級 RPG，雖然程式碼不長，但有幾個核心機制極易出錯。請在修改前仔細閱讀以下重點。

### 版本號管理規則 (Version Management)

**重要**：版本號定義在 `script.js` 開頭的 `GAME_VERSION` 常數（格式：`"X.Y.Z"`）。

#### 版本號格式
使用 **Semantic Versioning (語義化版本)**：
- **MAJOR (X)**：大改版，重大功能變更或架構調整
- **MINOR (Y)**：中改版，新增功能或重要改進
- **PATCH (Z)**：小改版，Bug 修復、數值調整、UI 優化等

#### AI 自動管理規則
- **小改版 (PATCH)**：AI 在完成修改後自動增加 PATCH 版本號（Z+1）
  - 例如：`1.0.0` → `1.0.1`
  - 適用於：Bug 修復、數值平衡調整、UI 微調、文字修正、效能優化等
- **中改版 (MINOR)**：AI 在完成修改後自動增加 MINOR 版本號（Y+1，Z 歸零）
  - 例如：`1.0.5` → `1.1.0`
  - 適用於：新增功能、新增職業、新增升級選項、新增遊戲機制等
- **大改版 (MAJOR)**：**由用戶手動增加**，AI 不得自動修改
  - 例如：`1.5.0` → `2.0.0`
  - 適用於：重大架構變更、核心玩法改變、大規模重構等

#### 實作範例
```javascript
// script.js 開頭
const GAME_VERSION = "1.0.0";  // 當前版本

// AI 完成小改版後自動更新為：
const GAME_VERSION = "1.0.1";

// AI 完成中改版後自動更新為：
const GAME_VERSION = "1.1.0";

// 大改版由用戶手動更新，AI 不應修改
```

#### 注意事項
- 每次修改完成後，AI 應檢查是否需要更新版本號
- 如果用戶明確要求大改版，AI 應提醒用戶手動更新版本號
- 版本號只顯示在主選單，遊戲畫面中不顯示

### 1. 系統架構核心
- **升級系統是核心**：所有數值（傷害、範圍、速度）都應從 `upgrade-config.js` 讀取，**絕對不要**在 `script.js` 硬編碼數值。
- **GM 測試工具**：`syncPlayerLevelWithUpgrades()` 是一個關鍵函數，它將「能力總等級」與「玩家等級」綁定。修改升級邏輯時，務必確認此同步機制是否受到影響。
- **座標系統**：
  - **邏輯座標**：`s.x`, `s.y`（網格座標，整數）。
  - **視覺座標**：`s.renderX`, `s.renderY`（像素座標，浮點數，用於平滑移動）。
  - **碰撞檢測**：大部分基於**邏輯座標**或**中心點像素距離**。修改碰撞邏輯時要小心區分。

### 2. 容易出錯的陷阱 (Pitfalls)
- **❌ 雙重傷害邏輯**：弓箭爆炸現在會對「被擊中的目標」造成**兩次傷害**（箭矢本身 + 爆炸）。這是有意為之的機制，請勿修復此「Bug」。
- **❌ 渲染順序**：`draw()` 函數中的繪製順序至關重要。陰影 -> 本體 -> 光環 -> 投射物 -> UI。顛倒順序會導致視覺錯誤（例如光環蓋住玩家）。
- **❌ 無敵效果效能**：無敵閃爍使用 `globalCompositeOperation = "lighter"`。這個操作非常耗效能，**絕對不要**在每一幀對全屏使用。目前的實作是只對「玩家 Sprite」使用，且限制頻率（每秒 2 次）。
- **❌ 陣列操作**：在遍歷 `snake` 或 `enemies` 陣列時進行 `splice` 移除元素極易導致索引錯誤或閃爍。請使用倒序遍歷或標記移除法。

### 3. 關鍵機制實作細節
- **法師光環**：為了效能，光環不再是 `effects` 陣列的一部分，而是直接在 `draw` 迴圈中繪製。
- **圖片預解碼**：為了防止首次繪製卡頓，圖片載入時會使用離屏 Canvas 預先繪製一次（Pre-decoding）。
- **移動插值**：使用**線性插值**（非指數），確保移動速度恆定。不要改回指數插值，否則會出現「一格一格跳動」的感覺。

### 4. 避免常見開發錯誤
- **❌ 避免「幽靈代碼」(Mock Code Overlay)**：
  - 禁止在檔案尾端添加「臨時測試用」的函數。JavaScript 後定義的函數會覆蓋先定義的，導致難以排查的 Bug（例如經驗值顯示錯誤）。
  - 測試完成後，務必徹底清除所有 Mock 數據和臨時函數。
  - 使用 `git diff` 仔細檢查提交內容，確保沒有意外保留的測試代碼。
- **❌ 函數唯一性**：
  - 在新增函數前，先搜尋是否已存在同名函數。
  - 避免使用過於通用的函數名稱（如 `updateUI`），應使用具體名稱（如 `updateLevelUI`）。

---

### 5. 新增系統實作細節 (v1.7)

#### 合成與進化系統
- **全域檢查**：`checkHeroMerge` 函數會遍歷 `snake` 陣列，統計各職業等級的數量。這是一個 `O(N)` 操作，每幀執行一次是可以接受的（因為 N 通常 < 50）。
- **合併邏輯**：
  - 使用物件 `groups` 分類索引：`key = role_level`。
  - 當數量滿足條件時，觸發合併。
  - **重要**：合併時保留 `index` 最小（最前方）的單位，移除其他單位。這能保持隊伍結構的穩定性。
- **特效處理**：升級特效 (`levelUpTimer`) 綁定在 `segment` 物件上，在 `draw` 循環中獨立渲染。使用 `lighter` 混合模式實現白光效果。

#### 道具生成邏輯
- **指定職業保底**：`spawnItem` 會先檢查場上 `items` 陣列，統計各職業指定道具數量。
- **優先級**：若某職業道具 < 2，則優先生成該職業道具。只有當所有職業都滿足條件（各 2 個）時，才生成隨機道具。

#### CSS 優化技巧
- **隱藏卷軸**：在 Modal 中使用 `scrollbar-width: none` 和 `::-webkit-scrollbar { display: none }` 來隱藏卷軸但保留滾動功能，提升手機版視覺體驗。
- **排版緊湊化**：減少 margin/padding，讓更多資訊能在一屏內顯示，減少使用者滾動需求。

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
  - 避免在繪製循環中更新狀態，提升性能

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

## 能力類型限制系統

### 設計目的
每輪遊戲最多可解鎖 10 種不同的能力類型，鼓勵玩家專精特定能力，增加策略性和重玩價值。

### 實現方式
- 使用 `Set` 數據結構追蹤已解鎖的能力類型（格式：`role.key`）
- 升級時檢查是否為新能力（`upgradeLevels[role][key] === 1`）
- 如果是新能力，加入 `unlockedAbilityTypes` Set
- 如果減到 0，從 Set 中移除
- 生成升級選項時，檢查 `unlockedAbilityTypes.size < abilityTypeLimit`

### 關鍵代碼
```javascript
// 追蹤已解鎖的能力類型
let unlockedAbilityTypes = new Set(); // 格式：role.key

// 升級時檢查是否為新能力
if (upgradeLevels[role][key] === 1 && !isUnlocked) {
    unlockedAbilityTypes.add(abilityTypeKey);
    updateAbilityTypeUI();
}

// 生成選項時檢查限制
const isAtLimit = unlockedAbilityTypes.size >= abilityTypeLimit;
if (!isUnlocked && isAtLimit) {
    // 不能解鎖新能力
}
```

## 爆炸效果系統

### 騎士死亡爆炸
- **觸發時機**：騎士 hitPoints 歸零時
- **傷害計算**：對範圍內所有敵人造成 `getKnightExplosionDamage()` 傷害
- **範圍計算**：使用 `getKnightExplosionRange()` 計算爆炸半徑
- **視覺特效**：金色爆炸特效（`#f59e0b`），從中心向外擴散，逐漸淡出

### 弓箭爆炸
- **觸發時機**：箭矢擊中敵人時
- **傷害計算**：對範圍內其他敵人造成 `getArcherExplosionDamage()` 傷害（不包括被直接擊中的敵人）
- **範圍計算**：使用 `getArcherExplosionRange()` 計算爆炸半徑
- **視覺特效**：綠色爆炸特效（`#22c55e`），環狀擴散

### 實現細節
```javascript
// 檢查範圍內敵人
enemies.forEach(enemy => {
    const dx = enemy.x - explosionX;
    const dy = enemy.y - explosionY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= explosionRange) {
        damageEnemy(enemy, explosionDamage);
    }
});

// 添加爆炸特效
effects.push({
    type: "knight-explosion" | "arrow-explosion",
    x, y,
    radius: 0,
    maxRadius: explosionRange,
    life: 20 | 15,
    alpha: 0.8 | 0.7,
    color: "#f59e0b" | "#22c55e"
});
```

## 法師縮放效果

### 設計目的
讓法師有呼吸式的動態感，視覺上更加生動有趣。

### 實現方式
- 使用 `performance.now()` 追蹤時間
- 每 2000ms 一個完整的縮放循環
- 使用 `Math.sin()` 創建平滑的縮放曲線
- 應用 Canvas 變換實現從中心點縮放

### 關鍵代碼
```javascript
// 計算縮放進度（0.0 到 1.0）
const currentTime = performance.now();
const elapsed = currentTime - mageScaleStartTime;
const cycleDuration = 2000; // 2秒
const progress = (elapsed % cycleDuration) / cycleDuration;

// 使用 sin 函數創建平滑曲線
const scaleFactor = Math.sin(progress * Math.PI); // 0 → 1 → 0
const maxScale = 1.0 + (scaleBonus / 100); // 例如 scaleBonus=30 時，maxScale=1.3
mageScale = 1.0 + (maxScale - 1.0) * scaleFactor;

// 應用縮放變換（從中心點）
const centerX = pos.x + GRID_SIZE / 2;
const centerY = pos.y + GRID_SIZE / 2;
ctx.translate(centerX, centerY);
ctx.scale(mageScale, mageScale);
ctx.translate(-centerX, -centerY);
```

### 注意事項
- 光環視覺大小也跟隨縮放，但實際傷害範圍不變
- 縮放效果只影響視覺，不影響碰撞檢測和傷害判定

## 測試功能實現

### 設計目的
方便開發和測試各種能力組合，驗證遊戲平衡性。

### 實現方式
- 密碼保護：使用簡單的字符串比較（`password === DEBUG_PASSWORD`）
- 動態生成修改面板：根據 `upgrade-config.js` 自動生成所有能力選項
- 實時更新：修改等級時立即更新 `upgradeLevels` 和 `unlockedAbilityTypes`
- 限制檢查：能力類型達上限時，未解鎖選項變半透明且無法點擊

### 關鍵代碼
```javascript
// 渲染修改面板
function renderDebugPanel() {
    // 遍歷所有升級選項
    Object.keys(config).forEach(role => {
        Object.keys(config[role]).forEach(key => {
            const isUnlocked = unlockedAbilityTypes.has(`${role}.${key}`);
            const isDisabled = !isUnlocked && isAtLimit;
            // 生成 HTML...
        });
    });
    
    // 綁定加減按鈕事件
    // 增加時檢查限制，減少時更新追蹤
}
```

### 安全考量
- 密碼僅用於防止誤觸，不是真正的安全措施
- 測試功能僅在開發環境使用，生產環境可考慮移除
