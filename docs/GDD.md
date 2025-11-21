# 勇者貪食蛇 RPG – 遊戲設計文件

## 1. 總覽
- **遊戲類型**：結合貪食蛇與隊伍養成的 2D Canvas 小品。
- **目標玩家**：喜歡策略、節奏控制與輕度 RPG 的休閒玩家。
- **核心體驗**：透過控制蛇頭（隊長）在網格上移動，收集勇者、對抗持續追擊的敵人。

## 2. 平台與技術
- **平台**：桌面與行動裝置瀏覽器。
- **主要技術**：HTML5 Canvas + JavaScript requestAnimationFrame。
- **資產策略**：優先載入 PNG，若缺檔則改用 Canvas 色塊與符號。
- **資料儲存**：Firebase Firestore（全球排行榜）、localStorage（玩家名字）。

## 3. 全域常數
```javascript
const GRID_SIZE = 40;       // 單格像素大小
const GAME_SPEED = 150;     // 蛇移動間隔 (ms)
const ENEMY_SPAWN_RATE = 2000; // 敵人生成間隔 (ms)
const ENEMY_SPEED = 1.5;    // 敵人逐幀速度 (px/frame)
const PROJECTILE_SPEED = 5; // 弓箭飛行速度
const ATTACK_RANGE = 300;   // 弓箭手攻擊距離
const AURA_RADIUS = 80;     // 法師光環半徑
const AURA_DAMAGE = 0.5;    // 法師光環每幀傷害
const ARROW_DAMAGE = 10;    // 弓箭傷害
const ENEMY_HP = 20;        // 敵人血量
const LEADER_MAX_HP = 150;  // 隊長血量上限
const LEADER_COLLISION_DAMAGE = 35; // 隊長被撞傷害
const LEADER_HEAL_ON_KILL = 10; // 擊殺敵人回復量
const ARCHER_COOLDOWN = 1000; // 弓箭手冷卻 (ms)
const BORDER_COLORS = ["#ef4444", "#eab308", "#3b82f6", "#22c55e"]; // 紅、黃、藍、綠
```

## 4. 遊戲循環

### 4.1 輸入處理
- **控制方式**：方向鍵 / WASD 控制蛇頭
- **限制**：禁止 180 度折返（不能直接反向移動）

### 4.2 蛇移動系統
- **移動方式**：依 `GAME_SPEED` 網格移動（Grid-based）
- **平滑插值**：使用 `renderX` 和 `renderY` 進行視覺位置插值，消除閃爍
- **面向系統**：
  - 向右移動時，所有角色面向右（原本圖片）
  - 向左移動時，所有角色面向左（使用 Canvas `scale(-1, 1)` 翻轉）
  - 向上或向下移動時，保持當前面向
- **成長機制**：吃到道具 +1 長度並加入新職業（隨機從弓箭手、法師、騎士中選擇）

### 4.3 隊長生命系統
- **血量池**：擁有 `LEADER_MAX_HP` 的血量
- **受傷機制**：被敵人直接撞擊扣除 `LEADER_COLLISION_DAMAGE`
- **死亡條件**：只在血量歸零時才 Game Over
- **回復機制**：擊殺敵人（遠程、光環或騎士自爆）會回復 `LEADER_HEAL_ON_KILL`
- **視覺回饋**：受傷時顯示血條（綠→紅漸層），血滿時不顯示

### 4.4 敵人行為
- **生成**：每 `ENEMY_SPAWN_RATE` 在畫面邊界隨機生成
- **移動**：逐幀以 `ENEMY_SPEED` 追蹤蛇頭（實時移動，非網格）
- **血量**：初始 `ENEMY_HP`，顯示血條和傷害數字

### 4.5 職業技能系統

#### 弓箭手 (Archer)
- **攻擊方式**：每 `ARCHER_COOLDOWN` 鎖定 `ATTACK_RANGE` 內最近敵人
- **投射物**：發射箭矢，速度 `PROJECTILE_SPEED`，傷害 `ARROW_DAMAGE`
- **視覺**：綠色背景，弓箭圖示

#### 法師 (Mage)
- **攻擊方式**：對 `AURA_RADIUS` 範圍內敵人每幀造成 `AURA_DAMAGE`
- **視覺**：藍色背景，星星圖示，外圈藍色光環特效

#### 騎士 (Knight)
- **防禦機制**：敵人碰撞時同歸於盡，附帶爆炸特效
- **守護機制**：若隊伍仍有騎士，敵人撞到任何隊員（除隊長外）都會由最先的騎士代為犧牲
- **視覺**：黃色背景，盾牌圖示

### 4.6 碰撞結果
- **敵人撞隊長**：造成 `LEADER_COLLISION_DAMAGE` 傷害，但只在血量耗盡才結束遊戲
- **敵人撞隊員（有騎士）**：由最先的騎士代為犧牲並擊殺敵人，觸發爆炸特效
- **敵人撞隊員（無騎士）**：移除被撞隊員，敵人繼續存活並追擊

### 4.7 得分與統計
- **隊伍長度**：即時顯示在 HUD，等於分數
- **擊殺統計**：累積擊殺數，顯示在 HUD，方便掌握補血進度
- **最長隊伍**：記錄本局最長隊伍長度，Game Over 時顯示

### 4.8 玩家顏色系統（為多玩家預留）
- **顏色分配**：每個玩家的所有勇者使用相同顏色邊框
- **顏色池**：紅、黃、藍、綠四種顏色
- **分配機制**：自動為玩家分配未使用的顏色，最多支援 4 個玩家
- **視覺**：每個勇者周圍有 3px 寬的顏色邊框

## 5. 資源與視覺

### 5.1 角色資源
| 名稱 | 檔名 | 降級顯示 | 備註 |
| --- | --- | --- | --- |
| 隊長 | `leader.png` | 紅色方塊＋皇冠符號 | 可面向左右 |
| 弓箭手 | `archer.png` | 綠底、弓箭線條 | 可面向左右 |
| 法師 | `mage.png` | 藍底、星形、外圈光環 | 可面向左右 |
| 騎士 | `knight.png` | 黃底、盾牌 | 可面向左右 |
| 敵人 | `enemy.png` | 淺灰底、深色核心 | 圓形，實時移動 |
| 道具 | `item.png` | 紫色圓形 | 招募新勇者 |

### 5.2 視覺特效
- **血條**：受傷時顯示，綠→紅漸層，高度 3-4px
- **傷害數字**：敵人受傷時顯示黃色數字
- **爆炸特效**：騎士犧牲或敵人死亡時顯示
- **光環特效**：法師周圍藍色光環
- **擊殺特效**：擊殺敵人時顯示金色光效

## 6. UI 與流程

### 6.1 開始畫面
- **觸發條件**：第一次進入或沒有保存的名字
- **功能**：
  - 輸入玩家名字
  - 右側顯示快速指引
  - 「啟動遊戲」按鈕
- **名字管理**：名字保存到 `localStorage`，下次自動使用

### 6.2 遊戲畫面
- **HUD**：標題、隊伍長度、擊殺計數
- **Canvas**：800×600 暗色背景、霓虹邊框
- **左側排行榜**：即時顯示前 10 名成績（橫列：姓名 | 擊殺數 | 最大隊伍）
- **右側快速指引**：常駐圖文面板，介紹各職業、敵人與道具
- **載入畫面**：只覆蓋 Canvas 區域，側邊面板在載入時也能顯示

### 6.3 Game Over 畫面
- **顯示內容**：
  - 「Game Over」標題
  - 本局最長隊伍長度
  - 總擊殺數
  - 名字輸入框（自動填入保存的名字）
  - 「上傳分數」按鈕
  - 「重新開始」按鈕
- **上傳機制**：
  - 如果輸入框為空，自動使用保存的名字
  - 上傳成功後更新保存的名字
  - 上傳到 Firebase Firestore

### 6.4 全球排行榜
- **資料結構**：
  - `name`：玩家名字
  - `score`：最長隊伍長度
  - `kills`：擊殺數
  - `date`：上傳日期
- **排序方式**：依擊殺數降序排列
- **顯示方式**：橫列顯示，即時同步（使用 Firebase `onSnapshot`）

## 7. 配置系統

### 7.1 快速指引配置
- **檔案**：`guide-config.js`
- **結構**：
  ```javascript
  window.GUIDE_CONFIG = {
    title: "快速指引",
    intro: "說明文字",
    items: [
      {
        image: "leader.png",
        alt: "隊長圖示",
        name: "隊長",
        description: "說明文字"
      },
      // ...
    ],
    tip: "操作提示"
  };
  ```
- **用途**：企劃人員可直接修改此檔案更新遊戲說明

### 7.2 遊戲常數配置
- **位置**：`index.html` 的 `<script>` 標籤內
- **可調整參數**：所有 `GRID_SIZE`、`GAME_SPEED` 等常數

## 8. 平衡調整指南
- **覺得太難**：
  - 增大 `GAME_SPEED`（讓蛇走慢點）
  - 增大 `ENEMY_SPAWN_RATE`（讓敵人少點）
  - 降低 `ENEMY_SPEED`（讓敵人走慢點）
  - 提高 `ARROW_DAMAGE` 或 `AURA_DAMAGE`（增強火力）
- **覺得太簡單**：
  - 反向調整上述參數
  - 減少 `GRID_SIZE`（地圖變大，操作更精細但更難）
- **血量調整**：
  - 增加 `LEADER_MAX_HP`（更容錯）
  - 減少 `LEADER_COLLISION_DAMAGE`（受傷更輕）
  - 增加 `LEADER_HEAL_ON_KILL`（回復更多）

## 9. 技術架構

### 9.1 檔案結構
```
HeroSnakeRPG/
├── index.html          # 入口頁面，包含常數定義和 Firebase 初始化
├── style.css           # 所有樣式定義
├── script.js           # 遊戲核心邏輯（約 1250 行）
├── guide-config.js     # 快速指引配置（可獨立修改）
├── *.png               # 角色與道具圖片（根目錄）
├── docs/
│   ├── GDD.md         # 遊戲設計文件（本文件）
│   └── CHANGELOG.md   # 更新紀錄
└── GUIDE-CONFIG-README.md  # 指引配置說明
```

### 9.2 核心變數
- **遊戲狀態**：`snake[]`、`enemies[]`、`projectiles[]`、`effects[]`、`item`、`isGameOver`
- **移動系統**：`direction`、`nextDirection`、`facing`、`renderX/renderY`
- **玩家系統**：`playerColors`、`currentPlayerId`、`currentPlayerColor`
- **計分系統**：`killCount`、`maxLengthThisRun`、`leaderHP`

### 9.3 主要函數
- **遊戲循環**：`gameLoop()`、`moveSnake()`、`draw()`
- **碰撞檢測**：`handleEnemyCollisions()`、`rectCircleCollide()`
- **職業技能**：`handleArcherAttacks()`、`handleMageAura()`
- **UI 管理**：`renderGuidePanel()`、`subscribeLeaderboard()`、`handleScoreUpload()`
- **資源管理**：`createAsset()`、`finishLoadingPhase()`

## 10. 後續規劃
- 新敵人種類（射手、衝刺者）
- 隊伍職業升級系統
- 道具池擴充（瞬移、護盾）
- 多玩家連線對戰（已預留顏色系統）
- 角色技能樹系統
