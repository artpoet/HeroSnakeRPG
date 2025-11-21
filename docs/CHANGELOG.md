# 更新紀錄

## 2025-11-21

### 角色面向系統
- **新增功能**：角色會根據移動方向改變面向
  - 向右移動時，所有角色面向右（原本圖片）
  - 向左移動時，所有角色面向左（使用 Canvas `scale(-1, 1)` 翻轉圖片）
  - 向上或向下移動時，保持當前面向不變
- **實作細節**：
  - 新增 `facing` 變數（1 = 向右，-1 = 向左）追蹤隊長面向
  - 在 `moveSnake()` 中，當 `direction.x !== 0` 時更新 `facing`
  - 修改 `createAsset()` 的 `draw()` 方法，接受 `facing` 參數
  - 隊長使用當前的 `facing` 值
  - 其他勇者根據相對於前一個 segment 的位置決定面向（x 座標比較）
  - 當 x 座標相同（上下移動）時，保持前一個 segment 的面向

### 平滑移動系統
- **新增功能**：蛇的移動使用插值平滑化，消除閃爍感
- **實作細節**：
  - 為每個 segment 添加 `renderX` 和 `renderY` 屬性（視覺位置）
  - 邏輯位置（`x`, `y`）立即更新，視覺位置平滑過渡
  - 使用線性插值（Lerp）每幀更新視覺位置，`lerpSpeed = 0.15`
  - 在 `gameLoop()` 中每一幀都執行插值計算
  - 當距離目標位置小於 0.001 時，直接設置為目標位置避免抖動

### 開始畫面與名字管理系統
- **新增功能**：遊戲開始前要求輸入名字，並自動記錄
- **實作細節**：
  - 新增 `startOverlay` 開始畫面，包含名字輸入框和「啟動遊戲」按鈕
  - 開始畫面右側顯示快速指引（使用 `startGuidePanel`）
  - 名字保存到 `localStorage`，下次進入自動使用
  - 如果沒有保存的名字，顯示開始畫面要求輸入
  - 如果有保存的名字，資源載入完成後直接開始遊戲
  - 上傳分數時，如果輸入框為空，自動使用保存的名字
  - 重新開始時，如果沒有名字，會再次顯示開始畫面

### 快速指引配置獨立化
- **新增功能**：快速指引內容獨立為配置文件，方便企劃修改
- **實作細節**：
  - 創建 `guide-config.js` 文件，包含所有快速指引內容
  - 配置結構：`title`、`intro`、`items[]`（每個項目包含 `image`、`alt`、`name`、`description`）、`tip`
  - 新增 `renderGuidePanelContent()` 通用函數渲染指引內容
  - 支援多個面板使用（遊戲中的 `guidePanel` 和開始畫面的 `startGuidePanel`）
  - 創建 `GUIDE-CONFIG-README.md` 說明文件，指導企劃如何修改

### 排行榜優化
- **調整功能**：排行榜改為橫列顯示，移除日期欄位
- **實作細節**：
  - 排行榜項目改為橫列布局：`姓名 | 擊殺數 | 最大隊伍`
  - 使用 `flex-direction: row` 和 `justify-content: space-between`
  - 姓名欄位使用 `flex: 1` 並加入文字溢出處理（`text-overflow: ellipsis`）
  - 擊殺數和最大隊伍使用 `flex-shrink: 0` 保持固定寬度
  - 移除日期顯示相關的 HTML 和 CSS

### 玩家顏色系統（為多玩家預留）
- **新增功能**：每個玩家的所有勇者使用相同顏色邊框
- **實作細節**：
  - 定義 `BORDER_COLORS` 陣列：紅、黃、藍、綠四種顏色
  - 新增 `playerColors` 物件管理不同玩家的顏色
  - 新增 `assignPlayerColor(playerId)` 函數為玩家分配顏色
  - 新增 `getCurrentPlayerColor()` 函數獲取當前玩家顏色
  - 在 `startGame()` 時為當前玩家分配顏色
  - 所有新創建的勇者都使用當前玩家的顏色
  - 為未來的多玩家系統預留機制（最多支援 4 個玩家，每個玩家不同顏色）

### 載入畫面優化
- **調整功能**：載入畫面只覆蓋遊戲畫布，側邊面板在載入時也能顯示
- **實作細節**：
  - 將 `loaderOverlay` 從全屏覆蓋改為只覆蓋 canvas 區域
  - 使用 `position: absolute` 相對於 canvas 容器定位
  - 左側排行榜和右側快速指引在載入時正常顯示
  - 玩家可以在等待載入時閱讀遊戲說明

### 名字本地儲存
- **新增功能**：上傳過的名字會自動記錄，下次遊戲時自動填入
- **實作細節**：
  - 上傳成功後使用 `localStorage.setItem("playerName", name)` 保存
  - 在 `resetUploadForm()` 中從 `localStorage.getItem("playerName")` 讀取
  - 頁面載入時自動讀取並填入輸入框
  - 玩家仍可修改名字，修改後上傳會更新保存值

## 2025-11-20

### 初版釋出
- 建立 Canvas 版本勇者貪食蛇 RPG
- 加入職業系統（弓箭手、法師、騎士）與敵人碰撞邏輯
- 實作道具成長、Game Over 覆蓋層與重新開始流程
- 新增降級圖形機制，確保無圖檔時仍可遊玩

### 血量系統
- 受傷角色才顯示細版血條（綠到紅漸層），避免滿血時佔據畫面
- 隊長導入血量機制：被撞扣血、擊殺敵人回復，讓戰鬥更具容錯與節奏感

### 騎士機制調整
- 騎士調整為全隊守護者：只要仍有騎士，敵人撞到任何隊員都會由騎士代為犧牲；無騎士時才輪到被撞隊員受害

### 擊殺統計
- 新增擊殺計數 UI 與效果，統計所有被擊倒的敵人並同步顯示在 HUD

### UI 改善
- 增加資產載入條、右側快速指南與 Game Over 統計（最長隊伍與擊殺數），改善第一次進入時的理解與回饋

### 專案結構重構
- 為解決本地端 CORS 問題，將所有檔案移回根目錄：`index.html`、`style.css`、`script.js` 與所有圖片檔案直接放在專案根目錄
- 將 Firebase 設定與初始化邏輯完全整合到 `index.html`，移除所有 ES Module 引用，改為使用全局變數暴露
- 清理專案結構：刪除 `public/` 資料夾中的舊檔案

### Firebase 排行榜
- 導入 Firebase Firestore 全球排行榜：Game Over 可輸入名字並上傳分數，左側面板即時顯示前 10 名成績（依擊殺數排序）

## 程式結構說明

### 核心檔案
- **`index.html`**：入口頁面，包含遊戲常數定義、Firebase 初始化、UI 結構
- **`style.css`**：所有樣式定義，包含響應式設計
- **`script.js`**：遊戲核心邏輯（約 1250 行）

### 配置檔案
- **`guide-config.js`**：快速指引配置，可獨立修改
- **`docs/GDD.md`**：遊戲設計文件
- **`docs/CHANGELOG.md`**：本文件

### 主要變數與狀態
- **遊戲狀態**：`snake[]`（隊伍）、`enemies[]`、`projectiles[]`、`effects[]`、`item`、`isGameOver`
- **移動系統**：`direction`、`nextDirection`、`facing`（面向）、`renderX/renderY`（視覺位置插值）
- **玩家系統**：`playerColors`、`currentPlayerId`、`currentPlayerColor`
- **計分系統**：`killCount`、`maxLengthThisRun`、`leaderHP`
- **Firebase**：透過 `window` 物件暴露的全局變數（`firebaseDb`、`firebaseLeaderboardRef` 等）

### 主要函數
- **遊戲循環**：`gameLoop()`、`moveSnake()`、`draw()`
- **碰撞檢測**：`handleEnemyCollisions()`、`rectCircleCollide()`
- **職業技能**：`handleArcherAttacks()`、`handleMageAura()`
- **UI 管理**：`renderGuidePanel()`、`subscribeLeaderboard()`、`handleScoreUpload()`
- **資源管理**：`createAsset()`、`finishLoadingPhase()`
