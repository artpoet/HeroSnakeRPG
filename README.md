# 勇者貪食蛇 RPG

一款以勇者隊伍為主題的 HTML5 Canvas 貪食蛇。玩家在網格上操控隊長收集道具、招募弓箭手／法師／騎士，並抵禦持續追擊的敵人。

## 專案結構
| 路徑 | 說明 |
| --- | --- |
| `public/index.html` | 入口頁與核心常數定義。 |
| `public/styles/main.css` | UI 與 Canvas 外框樣式。 |
| `public/scripts/main.js` | 遊戲邏輯、動畫迴圈、資產與 Firestore 互動。 |
| `public/assets/images/` | 角色與道具圖示。 |
| `docs/GDD.md` | 遊戲設計文件 (Game Design Document)。 |
| `docs/CHANGELOG.md` | 更新紀錄。 |
| `docs/player-guide.html` | 玩家導覽手冊。 |

## 執行方式
1. 直接以瀏覽器開啟 `public/index.html`。
2. 使用方向鍵或 WASD 操控隊伍。
3. Game Over 後可輸入暱稱上傳分數，或按「重新開始」重啟。

## 文件
- 詳細規則與參數：`docs/GDD.md`
- 玩家用圖文介紹：`docs/player-guide.html`
- 版本記錄：`docs/CHANGELOG.md`

## 第三方服務
- Firebase Firestore：儲存與即時同步全球排行榜，需要網路連線才可上傳／讀取分數。

## 授權
本專案採 MIT License 授權，詳見 `LICENSE`。

