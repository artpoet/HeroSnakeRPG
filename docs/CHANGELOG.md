# 更新紀錄

## 2025-12-XX（最新）

### 等級與經驗值系統
- **新增功能**：玩家等級和經驗值系統
- **實作細節**：
  - 玩家有等級和經驗值，經驗值滿了會升級
  - 等級和經驗值條顯示在遊戲視窗下方
  - 經驗值來源：擊殺敵人獲得經驗值，不同等級的敵人提供不同經驗值
  - 升級公式：`所需經驗值 = baseExp * (等級 ^ expMultiplier)`
    - `baseExp = 80`：基礎經驗值需求
    - `expMultiplier = 1.3`：經驗值成長倍率
  - 升級時會彈出三選一升級選項供玩家選擇
  - 選擇升級時會鎖血，避免在選擇過程中死亡
- **配置檔案**：`upgrade-config.js`

### 升級三選一系統
- **新增功能**：升級時彈出三選一升級選項
- **實作細節**：
  - 每次升級時隨機生成 3 個升級選項
  - 同職業只會出現一個選項，避免重複
  - 選項顯示名稱、效果、當前 Lv/最大 Lv
  - 選項滿級後，效果統一變成隊長最大HP+1
  - 升級選擇時暫停遊戲邏輯，但繼續繪製
- **升級選項**：
  - **法師**：施法範圍+1（最大Lv8）、施法傷害+1（最大Lv5）
  - **弓箭手**：弓箭數量+1（最大Lv3）、射擊速度+1（最大Lv10）
  - **騎士**：可被攻擊次數+1（最大Lv10）、死亡後增加隊伍長度+1（最大Lv3）
  - **隊長**：血量+5（最大Lv10）、傷害+1（最大Lv5）

### 怪物等級系統重構
- **調整功能**：將怪物系統從強度等級（tier）改為簡單的等級系統（1-10級）
- **實作細節**：
  - 怪物等級範圍：1-10 級
  - 屬性計算公式：
    - 血量：`baseHp + (level - 1) * hpPerLevel`
    - 傷害：`baseDamage + (level - 1) * damagePerLevel`
    - 經驗值：`baseExp * level`
  - 等級顯示：怪物圖片下方顯示白色文字 "Lv1"、"Lv2" 等
  - 移除怪物名稱（普通、精英等），只顯示等級
- **配置檔案**：`upgrade-config.js` 中的 `enemyLevel` 配置

### 怪物生成系統
- **新增功能**：根據玩家等級決定怪物出現機率
- **實作細節**：
  - 一開始只出現等級 1 的怪物（最弱）
  - 隨著玩家等級提升，逐漸出現更強的怪物
  - 每個玩家等級階段定義可出現的怪物等級及其出現機率（權重）
  - 使用權重系統隨機選擇怪物等級
- **配置檔案**：`enemy-spawn-config.js`（獨立配置文件）
- **詳細說明**：參考 `docs/ENEMY-SPAWN-README.md`

### 職業升級效果整合
- **調整功能**：各職業技能會根據升級等級動態調整
- **實作細節**：
  - **弓箭手**：
    - 射擊速度可升級（從射程改為速度）
    - 弓箭數量可升級（每次攻擊可發射多支箭矢）
  - **法師**：
    - 光環範圍可升級
    - 光環傷害可升級
  - **騎士**：
    - 可被攻擊次數可升級（越接近消失越透明，但邊框不透明）
    - 死亡後增加隊伍長度可升級
  - **隊長**：
    - 最大血量可升級
    - 撞擊傷害可升級（預留功能）

### 邊界檢測優化
- **調整功能**：邊界檢測改為完全基於視覺位置來判斷
- **實作細節**：
  - 邏輯位置可以暫時超出邊界，但只有在視覺位置真的超出邊界時才判定死亡
  - 使用角色中心點來判斷，考慮角色大小（`GRID_SIZE / 2`）
  - 在 `gameLoop` 中，在更新視覺位置（lerp）後檢查邊界
  - 避免因平滑移動（lerp）延遲導致的誤判
- **效果**：確保玩家看到的和實際判定完全一致，不會再出現視覺上還沒碰到邊界就判定死亡的情況

### UI 優化
- **新增功能**：等級和經驗值條顯示在遊戲視窗下方
- **調整功能**：Game Over 畫面新增最高等級顯示
- **調整功能**：怪物血量文字只在扣血時短暫顯示
- **調整功能**：怪物等級顯示在圖片下方，格式為 "Lv1"、"Lv2" 等

### 頁面滾動優化
- **調整功能**：修復移動時整個網頁都在動的問題
- **實作細節**：
  - 為 `html` 和 `body` 添加 `overflow-x: hidden` 和 `overflow-y: auto`
  - 為 `.game-wrapper` 添加 `flex-shrink: 0` 和 `margin-bottom`
  - 防止布局跳動

## 2025-11-21

### 排行榜系統優化
- **調整功能**：排行榜分為「全球排行榜」和「今日排行榜」，上下排列顯示
- **實作細節**：
  - 移除切換按鈕，改為同時顯示兩個排行榜卡片
  - 全球排行榜顯示前 5 名（總排行）
  - 今日排行榜顯示前 5 名（當日排行）
  - 使用客戶端過濾方式處理今日排行榜，避免 Firebase 查詢錯誤
  - 查詢所有記錄後，在 JavaScript 中過濾今天的記錄
  - 判斷是否進入前 10 名時，仍使用總排行榜的前 10 名數據
- **技術改進**：
  - 修復 Firebase 查詢錯誤（`where` 不等式過濾與 `orderBy` 衝突）
  - 改為一次性查詢所有記錄，然後在客戶端過濾和排序

### 邊界視覺化
- **新增功能**：繪製邊界線，讓玩家清楚看到遊戲區域邊界
- **實作細節**：
  - 在畫布上繪製白色虛線邊界線（3px 寬）
  - 邊界線對應實際的遊戲區域（`gridWidth * GRID_SIZE`）
  - 幫助玩家判斷是否接近邊界，減少「還沒碰到就死了」的困惑
- **邊界檢測邏輯**：
  - 邊界檢測基於邏輯位置（網格座標），非視覺位置
  - 當 `nextX >= gridWidth` 或 `nextY >= gridHeight` 時觸發遊戲結束
  - 由於平滑移動（lerp），視覺位置可能尚未到達邊界，但邏輯位置已超出

### 角色面向系統調整
- **調整功能**：勇者根據自己的左右位移改變面向，而非跟隨 leader
- **實作細節**：
  - 在 `moveSnake()` 中，每個 segment 根據自己的前後位置更新 `facing`
  - 比較移動前後的 x 座標（`prevX` 和 `currentX`）
  - 如果有左右移動（`currentX !== prevX`），根據移動方向更新 `facing`
  - 如果沒有左右移動（上下移動），保持原來的 `facing` 不變
  - 在 `draw()` 中直接使用 segment 的 `facing`，如果沒有則使用 leader 的 `facing`
- **行為說明**：
  - 當勇者向右移動時，面向右（facing = 1）
  - 當勇者向左移動時，面向左（facing = -1）
  - 當勇者上下移動時，保持原來的面向不變

### 繪製順序優化
- **調整功能**：調整角色和血條的繪製順序，確保正確的階層顯示
- **實作細節**：
  - 角色繪製改為從後往前（從 `snake.length - 1` 到 `0`）
  - 後面的角色先繪製，前面的角色後繪製（前面的會覆蓋後面的）
  - 血條繪製從角色繪製中分離，在所有角色繪製完成後統一繪製
  - 確保血條顯示在最上層，不會被任何角色遮住
- **效果**：
  - Leader 和前面的隊員會顯示在後面的隊員之上
  - 血條永遠顯示在最上層，清晰可見

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
  - 遊戲常數定義在 `<script>` 標籤開頭（`GRID_SIZE`、`GAME_SPEED` 等）
  - Firebase SDK 透過 ES Module 導入，並暴露全局變數給 `script.js` 使用
  - UI 結構包含：遊戲畫布、左側排行榜、右側快速指引、開始畫面、Game Over 覆蓋層
- **`style.css`**：所有樣式定義，包含響應式設計
  - 暗色系主題，配合遊戲風格
  - Flexbox 布局，確保畫布和側邊面板正確排列
  - 排行榜和快速指引面板固定寬度，畫布固定 800x600
- **`script.js`**：遊戲核心邏輯（約 1900 行）
  - 所有遊戲邏輯、UI 管理、Firebase 互動都在此檔案

### 配置檔案
- **`guide-config.js`**：快速指引配置，可獨立修改
  - 結構：`title`、`intro`、`items[]`、`tip`
  - 企劃人員可直接修改此檔案，無需觸碰核心程式碼
- **`upgrade-config.js`**：升級系統配置，可獨立修改
  - 結構：`leveling`、`enemyLevel`、`upgrades`、`maxedOutBonus`
  - 包含等級經驗值、怪物屬性、升級選項等配置
  - 詳細說明請參考 `docs/UPGRADE-SYSTEM-README.md`
- **`enemy-spawn-config.js`**：怪物生成配置，可獨立修改
  - 結構：`spawnByPlayerLevel[]`（根據玩家等級定義怪物出現機率）
  - 詳細說明請參考 `docs/ENEMY-SPAWN-README.md`
- **`docs/GDD.md`**：遊戲設計文件
  - 詳細的遊戲規則、參數、機制說明
- **`docs/CHANGELOG.md`**：本文件
  - 所有更新紀錄和程式結構說明

### 主要變數與狀態（script.js）

#### 遊戲狀態
- `snake[]`：隊伍陣列，每個元素包含 `x`、`y`、`renderX`、`renderY`、`role`、`facing`、`borderColor`、`lastShot` 等
- `enemies[]`：敵人陣列，包含位置、血量、移動狀態等
- `projectiles[]`：投射物陣列（弓箭）
- `effects[]`：特效陣列（爆炸、擊殺、受傷等）
- `item`：當前道具物件（`null` 或包含 `x`、`y`）
- `isGameOver`：遊戲是否結束

#### 移動系統
- `direction`：當前移動方向 `{ x, y }`
- `nextDirection`：下一個移動方向（用於防止 180 度折返）
- `facing`：隊長面向（1 = 向右，-1 = 向左）
- `renderX`、`renderY`：每個 segment 的視覺位置（用於平滑插值）
- `gridWidth`、`gridHeight`：網格寬度和高度（根據畫布大小計算）

#### 玩家系統
- `playerColors`：物件，儲存每個玩家的顏色 `{ playerId: color }`
- `currentPlayerId`：當前玩家 ID（目前固定為 "player1"）
- `currentPlayerColor`：當前玩家的顏色（用於邊框）

#### 計分系統
- `killCount`：擊殺數
- `maxLengthThisRun`：本局最長隊伍長度
- `leaderHP`：隊長當前血量

#### 等級系統
- `playerLevelValue`：玩家當前等級
- `playerExp`：玩家當前經驗值
- `maxLevelThisRun`：本局最高等級
- `gameStartTime`：遊戲開始時間（用於計算怪物等級）

#### 升級系統
- `upgradeLevels`：物件，追蹤各升級的等級
  - `mage.auraRange`、`mage.auraDamage`
  - `archer.arrowCount`、`archer.arrowSpeed`
  - `knight.hitPoints`、`knight.deathBonus`
  - `leader.maxHp`、`leader.damage`
- `isChoosingUpgrade`：是否正在選擇升級（選擇時鎖血）

#### Firebase 相關
- 透過 `window` 物件暴露的全局變數：
  - `window.firebaseDb`：Firestore 資料庫實例
  - `window.firebaseLeaderboardRef`：排行榜集合引用
  - `window.firebaseAddDoc`：添加文件函數
  - `window.firebaseQuery`、`window.firebaseOrderBy`、`window.firebaseLimit`、`window.firebaseGetDocs`、`window.firebaseWhere`：查詢相關函數
  - `window.firebaseReady`：Firebase 是否初始化完成

#### UI 元素引用
- 所有 DOM 元素在檔案開頭統一引用
- 等級系統：`playerLevel`、`expText`、`expBarFill`、`maxLevelValue`
- 升級選擇：`upgradeOverlay`、`upgradeOptions`
- 排行榜：`leaderboardListAll`（全球）、`leaderboardListToday`（今日）
- 開始畫面：`startOverlay`、`startPlayerNameInput`、`startGameBtn`、`startLoader`、`startForm`
- Game Over：`overlay`、`playerNameInput`、`uploadScoreBtn`、`restartBtn`

### 主要函數（script.js）

#### 遊戲循環
- `gameLoop(timestamp)`：主遊戲循環，使用 `requestAnimationFrame`
  - 處理移動時機（`GAME_SPEED` 間隔）
  - 執行平滑插值計算（每幀更新視覺位置）
  - 邊界檢測（基於視覺位置）
  - 更新敵人、投射物、特效
  - 處理碰撞檢測
  - 繪製畫面
- `moveSnake(timestamp)`：移動蛇（隊伍）
  - 更新 leader 位置
  - 更新所有 segment 位置（跟隨前一個）
  - 邊界檢測
  - 碰撞檢測（撞到自己）
  - 根據位移更新每個 segment 的 `facing`
  - 處理道具收集和新勇者加入
- `draw()`：繪製所有遊戲元素
  - 繪製邊界線
  - 繪製道具
  - 繪製角色（從後往前，確保前面的在上層）
  - 繪製血條（最後繪製，確保在最上層）
  - 繪製敵人、投射物、特效

#### 碰撞檢測
- `handleEnemyCollisions()`：處理敵人與隊伍的碰撞
  - 檢查 leader 是否撞到敵人
  - 檢查隊伍成員是否撞到敵人
  - 處理騎士守護機制
- `rectCircleCollide(rect, circle)`：矩形與圓形碰撞檢測
- `handleBodyCollision(enemy, removeSet)`：處理隊伍成員與敵人的碰撞
  - 優先使用騎士代為犧牲
  - 無騎士時移除被撞成員

#### 職業技能
- `handleArcherAttacks(timestamp)`：處理弓箭手攻擊
  - 檢查冷卻時間
  - 尋找最近敵人（無距離限制）
  - 發射箭矢（數量可升級，速度可升級）
- `handleMageAura()`：處理法師光環傷害
  - 對範圍內敵人造成持續傷害（範圍和傷害可升級）
- `damageEnemy(enemy, amount)`：對敵人造成傷害
  - 更新敵人血量
  - 顯示傷害數字
  - 處理擊殺（給予經驗值）
- `getArcherArrowSpeed()`：獲取弓箭手箭矢速度（考慮升級）
- `getArcherArrowCount()`：獲取弓箭手箭矢數量（考慮升級）
- `getMageAuraRadius()`：獲取法師光環範圍（考慮升級）
- `getMageAuraDamage()`：獲取法師光環傷害（考慮升級）
- `getKnightHitPoints()`：獲取騎士可被攻擊次數（考慮升級）
- `getKnightDeathBonus()`：獲取騎士死亡加成（考慮升級）
- `getLeaderMaxHp()`：獲取隊長最大血量（考慮升級）

#### UI 管理
- `renderGuidePanel()`：渲染遊戲中的快速指引面板
- `renderStartGuidePanel()`：渲染開始畫面的快速指引
- `renderGuidePanelContent(panelElement, config)`：通用函數，根據配置渲染指引內容
- `updateLeaderboard()`：更新排行榜（一次性查詢）
  - 查詢所有記錄（按擊殺數排序）
  - 客戶端過濾今日記錄
  - 更新全球排行榜和今日排行榜顯示
- `renderLeaderboardList(listElement, data)`：渲染排行榜列表
- `checkIfInLeaderboard()`：檢查當前分數是否進入前 10 名
  - 決定是否顯示「上傳分數」按鈕
- `handleScoreUpload()`：處理分數上傳
  - 驗證輸入
  - 上傳到 Firebase
  - 更新本地儲存的名字
- `checkAndShowStartScreen()`：檢查並顯示開始畫面
  - 根據 `localStorage` 中是否有名字決定是否顯示

#### 資源管理
- `createAsset(src, fallback)`：創建資產物件
  - 載入圖片
  - 提供 `draw(x, y, size, facing)` 方法
  - 支援圖片翻轉（根據 `facing`）
  - 圖片載入失敗時使用 fallback 函數
- `finishLoadingPhase()`：完成載入階段
  - 隱藏載入畫面
  - 根據是否有保存的名字決定顯示開始畫面或直接開始遊戲

#### 玩家顏色系統
- `assignPlayerColor(playerId)`：為玩家分配顏色
  - 從 `BORDER_COLORS` 中選擇未使用的顏色
- `getCurrentPlayerColor()`：獲取當前玩家顏色
  - 如果沒有分配，自動分配

#### 等級與升級系統
- `addExp(amount)`：添加經驗值
  - 更新經驗值
  - 檢查是否升級
  - 更新 UI
- `checkLevelUp()`：檢查是否升級
  - 計算所需經驗值
  - 如果經驗值足夠，升級並顯示升級選擇
- `updateLevelUI()`：更新等級 UI
  - 更新等級文字
  - 更新經驗值文字和進度條
- `showUpgradeSelection()`：顯示升級選擇
  - 生成三個升級選項
  - 暫停遊戲邏輯
  - 鎖血（避免在選擇過程中死亡）
- `selectUpgrade(option)`：選擇升級
  - 應用升級效果
  - 關閉升級選擇
  - 恢復遊戲邏輯
- `generateUpgradeOptions()`：生成升級選項（三選一，同職業只出現一個）
- `getUpgradedValue(role, key, baseValue)`：獲取升級後的數值

#### 怪物系統
- `calculateEnemyLevel()`：計算敵人等級（根據玩家等級和出現機率）
- `getEnemyLevelConfig(level)`：獲取敵人等級配置（根據等級計算屬性）
- `spawnEnemy()`：生成敵人（根據配置隨機選擇等級）

#### 其他工具函數
- `startGame()`：開始新遊戲
  - 初始化所有遊戲狀態
  - 分配玩家顏色
  - 重置計分和等級
  - 啟動遊戲循環
- `triggerGameOver()`：觸發遊戲結束
  - 更新排行榜
  - 檢查是否進入前 10 名
  - 顯示 Game Over 覆蓋層（包含最高等級）
- `drawHealthBar(x, y, width, height, current, max)`：繪製血條
- `drawFallbackBlock(color, drawFn, x, y, size)`：繪製降級圖形
- `escapeHtml(text)`：轉義 HTML 特殊字符
