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
  - **碰撞檢測**：基於**邏輯座標**（`moveSnake`）或**像素距離**（`updateEnemies`）。修改碰撞邏輯時要小心區分。
  - **特效繪製**：必須經過 `camera.transform` 轉換為螢幕座標，**不要**直接繪製世界座標。

### 2. 容易出錯的陷阱 (Pitfalls)
- **❌ 雙重傷害邏輯**：弓箭爆炸現在會對「被擊中的目標」造成**兩次傷害**（箭矢本身 + 爆炸）。這是有意為之的機制，請勿修復此「Bug」。
- **❌ 渲染順序**：`draw()` 函數中的繪製順序至關重要。陰影 -> 本體 -> 光環 -> 投射物 -> 特效 -> UI。顛倒順序會導致視覺錯誤。
- **❌ 特效半徑計算**：在 `draw()` 中計算特效半徑時，務必使用 `Math.max(0, ...)` 保護，並使用正確的 `maxLife` 計算進度。否則當 `life > maxLife` 或 `life < 0` 時，會產生負半徑導致 `IndexSizeError` 崩潰。
- **❌ 陣列操作**：在遍歷 `snake` 或 `enemies` 陣列時進行 `splice` 移除元素極易導致索引錯誤或閃爍。請使用倒序遍歷或標記移除法。

### 3. 關鍵機制實作細節
- **死亡邏輯**：
  - 玩家死亡時不會立即觸發 `triggerGameOver`，而是調用 `startPlayerDeath` 進入約 1 秒的「死亡動畫」狀態。
  - 此時 `isPlayerDying = true`，遊戲邏輯（移動、怪物）暫停，只播放特效。
  - 隊長不會消失，而是變紅並覆蓋崩解特效 (`player-disintegrate`)。
- **撞牆處理**：
  - 在 `moveSnake` 中檢測到撞牆後，直接調用 `startPlayerDeath` 並 `return`，**不執行**後續的位置更新。這確保玩家停在撞擊點（原地死亡），不會有視覺上的回彈。
  - **防止回彈機制**：在 `startPlayerDeath` 中，必須將所有蛇段的 `targetRenderX/Y` 和 `startRenderX/Y` 都設為當前的 `renderX/Y`，並清除所有回彈速度（`bounceVx`, `bounceVy`）。這樣可以防止 Lerp 插值繼續移動，避免視覺上的回彈效果。
  - **死亡期間回彈保護**：在 `gameLoop` 的 Lerp 邏輯中，當 `isPlayerDying = true` 時，不應用回彈速度，確保死亡動畫期間不會有任何移動。
- **無敵機制**：
  - **隊伍級別判定**：在 `updateEnemies` 中，碰撞檢測前先檢查 `invincibilityEndTime`。如果無敵，跳過所有碰撞邏輯。這解決了多怪同時攻擊導致瞬間秒殺的問題。
  - **冷卻時間**：碰撞冷卻時間設為 500ms。

### 4. 避免常見開發錯誤
- **❌ 避免「幽靈代碼」(Mock Code Overlay)**：禁止在檔案尾端添加「臨時測試用」的函數。
- **❌ 函數唯一性**：在新增函數前，先搜尋是否已存在同名函數。

---

### 5. 新增系統實作細節 (v1.4+)

#### 死亡與特效系統
- **延遲 Game Over**：使用 `isPlayerDying` 和 `deathTimer` 實作。
- **特效防護**：所有特效在繪製時都有負半徑保護。
- **崩解特效**：`player-disintegrate` 使用像素方塊飛散效果，繪製時需注意座標轉換（世界座標 -> 螢幕座標）。

#### 石頭生成與碰撞
- **生成保護期**：石頭生成後的前 2 秒 (`SPAWN_PROTECTION_TIME`) 為半透明且無碰撞體積，避免玩家「冤死」。
- **碰撞邏輯**：
  - 玩家：`moveSnake` 中檢查網格座標重疊。
  - 怪物：`updateEnemies` 中檢查圓形與矩形碰撞，有冷卻時間，冷卻中允許「擠過去」。
  - 弓箭：`updateProjectiles` 中檢查點與矩形碰撞，撞到消失。

#### 隊員管理
- **死亡特效**：隊員死亡時觸發 `member-death`（血霧）。
- **招募邏輯**：騎士「榮譽號召」技能 (`deathBonus`) 會在騎士死亡時觸發，隨機招募指定數量的新隊員。

## 移動流暢度：線性插值 vs 指數插值

### 問題描述
實作碰撞效果後，玩家移動出現明顯卡頓，有「一格一格跳動」的感覺。怪物移動卻很平滑。

### 解決方案：線性插值
使用**線性插值**（Linear Interpolation）：
```javascript
// ✅ 正確：線性插值
const moveProgress = Math.min(timeSinceMove / currentMoveSpeed, 1); // 0.0 到 1.0
s.renderX = s.startRenderX + (s.targetRenderX - s.startRenderX) * moveProgress;
s.renderY = s.startRenderY + (s.targetRenderY - s.startRenderY) * moveProgress;
```

### 關鍵實作細節
1. **記錄插值起點**：在 `moveSnake` 中，當邏輯位置更新時，記錄 `startRenderX/Y`。
2. **在 gameLoop 中每幀執行插值**：根據 `timeSinceMove` 計算 `renderX/Y`。
3. **初始化正確性**：在 `startGame` 中確保所有屬性都有初始值。

### 常見錯誤
❌ **錯誤 1**：在 `moveSnake` 中重置 `renderX/Y`（導致跳動）。
❌ **錯誤 2**：使用指數插值（導致速度不均）。
❌ **錯誤 3**：不記錄起始位置（導致插值錯誤）。

### 暫停恢復後的瞬間移動問題
**問題描述**：當遊戲暫停（升級選單或倒數）時，`lastMoveTime` 沒有更新，導致時間持續累積。恢復遊戲瞬間，計算出的「經過時間」非常大，導致遊戲邏輯判定應該「立即移動」，造成：
- **瞬間移動**：蛇在恢復的第一幀就移動了一格，玩家完全沒有反應時間。
- **畫面不同步**：由於移動是瞬間發生的，而畫面的平滑移動（Lerp）依賴於時間插值，重置後的插值計算會讓畫面在這一幀停留在「移動前」的位置。

**解決方案**：在所有恢復遊戲邏輯執行前（`selectUpgrade`、`startCountdown` 結束時），重置 `lastMoveTime` 和 `lastEnemySpawn` 為當前時間（`performance.now()`）。這會讓遊戲邏輯認為「剛完成一次移動」，從而等待一個完整的移動週期才進行下一次移動，給予玩家反應時間並確保畫面與邏輯同步。

## Canvas 座標轉換

### 問題描述
滑鼠拖曳時，軌跡線段出現在滑鼠下方約 136px 的位置。

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
```
