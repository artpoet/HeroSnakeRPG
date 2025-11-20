# 勇者貪食蛇 RPG – 遊戲設計文件

## 1. 總覽
- **遊戲類型**：結合貪食蛇與隊伍養成的 2D Canvas 小品。
- **目標玩家**：喜歡策略、節奏控制與輕度 RPG 的休閒玩家。
- **核心體驗**：透過控制蛇頭（隊長）在網格上移動，收集勇者、對抗持續追擊的敵人。

## 2. 平台與技術
- **平台**：桌面與行動裝置瀏覽器。
- **主要技術**：HTML5 Canvas + JavaScript requestAnimationFrame。
- **資產策略**：優先載入 PNG，若缺檔則改用 Canvas 色塊與符號。

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
```

## 4. 遊戲循環
1. **輸入**：方向鍵 / WASD 控制蛇頭，禁止 180 度折返。
2. **蛇移動**：依 `GAME_SPEED` 網格移動；吃到道具 +1 長度並加入新職業。
3. **隊長生命**：
   - 擁有 `LEADER_MAX_HP` 的血量池。
   - 被敵人直接撞擊扣除 `LEADER_COLLISION_DAMAGE`，只在血量歸零時才 Game Over。
   - 擊殺敵人（遠程、光環或騎士自爆）會回復 `LEADER_HEAL_ON_KILL`，血條漸進回滿。
4. **敵人行為**：每 `ENEMY_SPAWN_RATE` 生成在邊界，逐幀以 `ENEMY_SPEED` 追蛇頭。
5. **職業技能**：
   - 弓箭手：每 1000ms 鎖定 `ATTACK_RANGE` 內最近敵人射箭（`PROJECTILE_SPEED`，`ARROW_DAMAGE`）。
   - 法師：對 `AURA_RADIUS` 範圍敵人每幀造成 `AURA_DAMAGE`，並顯示光環特效。
   - 騎士：敵人碰撞時同歸於盡，附帶爆炸特效。
6. **碰撞結果**：
   - 敌人撞隊長：造成傷害，但只在血量耗盡才結束遊戲。
   - 敌人撞除隊長外的任一隊員：若隊伍仍有騎士，則由最先的騎士代為犧牲並擊殺敵人；無騎士時才移除被撞隊員。
   - 騎士犧牲會回復隊長少量生命並觸發爆炸特效。
7. **得分**：隊伍長度 = 分數，UI 即時更新。
8. **擊殺統計**：顯示累積擊殺數，方便掌握補血進度與戰鬥效率。

## 5. 資源與視覺
| 名稱 | 檔名 | 備註 |
| --- | --- | --- |
| 隊長 | `leader.png` | 若缺檔顯示紅色方塊＋皇冠符號 |
| 弓箭手 | `archer.png` | 綠底、弓箭線條 |
| 法師 | `mage.png` | 藍底、星形、外圈光環 |
| 騎士 | `knight.png` | 黃底、盾牌 |
| 敵人 | `enemy.png` | 淺灰底、深色核心 |
| 道具 | `item.png` | 紫色圓形 |

## 6. UI 與流程
1. **HUD**：標題、隊伍長度、擊殺計數（直接顯示於 Scoreboard）。
2. **Canvas**：800×600 暗色背景、霓虹邊框。
3. **Game Over**：半透明遮罩、顯示文字與「重新開始」按鈕。
4. **血條顯示**：
   - 隊長與敵人受到傷害後，頭頂浮現漸層血條（綠→紅），血滿時不顯示，避免遮擋地圖。
   - 血條高度僅 3~4px，確保視覺輕量。

## 7. 平衡調整指南
- 覺得太難：增大 `GAME_SPEED`、`ENEMY_SPAWN_RATE`，或降低 `ENEMY_SPEED`。
- 覺得太簡單：反向調整，或改小 `GRID_SIZE` 以提高操控難度。
- 火力不足：提高 `ARROW_DAMAGE`、`AURA_DAMAGE`。

## 8. 後續規劃
- 新敵人種類（射手、衝刺者）。
- 隊伍職業升級系統。
- 道具池擴充（瞬移、護盾）。


