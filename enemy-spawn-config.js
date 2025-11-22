/*
  勇者貪食蛇 RPG
  Copyright © 2025 Yupo Huang. All rights reserved.
  
  本遊戲及其所有代碼、資源、設計均為 Yupo Huang 的智慧財產權。
  未經授權，不得複製、修改、分發或商業使用。
*/

// 怪物生成配置檔 - 企劃人員可直接修改此檔案調整怪物出現機率
// Enemy Spawn Configuration - Planners can modify this file directly

window.ENEMY_SPAWN_CONFIG = {
  // ========== 怪物等級與出現機率系統 ==========
  // 根據玩家等級，定義不同等級怪物的出現機率（怪物等級範圍：1-8）
  // 一開始只出現等級 1 的怪物，隨著玩家等級提升，逐漸出現更強的怪物
  // 出場機率綁定玩家等級，因為：
  // 1. 更穩定，不會因為運氣好壞而波動太大
  // 2. 可以設計平滑的難度曲線
  // 3. 升級系統已經存在，容易追蹤
  
  // 玩家等級階段配置
  // 每個階段定義該階段可出現的怪物等級及其出現機率（權重）
  spawnByPlayerLevel: [
    {
      // 玩家等級 1-2：只出現等級 1 的怪物
      playerLevelRange: [1, 2],
      enemyLevels: [
        { level: 1, weight: 100 },  // 100% 機率出現等級 1
      ],
    },
    {
      // 玩家等級 3-5：等級 1-2 混合，開始出現等級 2
      playerLevelRange: [3, 5],
      enemyLevels: [
        { level: 1, weight: 70 },   // 70% 機率
        { level: 2, weight: 30 },   // 30% 機率
      ],
    },
    {
      // 玩家等級 6-9：等級 1-3 混合，主要還是低等級
      playerLevelRange: [6, 9],
      enemyLevels: [
        { level: 1, weight: 40 },   // 40% 機率
        { level: 2, weight: 45 },   // 45% 機率
        { level: 3, weight: 15 },   // 15% 機率
      ],
    },
    {
      // 玩家等級 10-13：等級 2-3 混合，開始少量出現等級 4
      playerLevelRange: [10, 13],
      enemyLevels: [
        { level: 2, weight: 45 },   // 45% 機率
        { level: 3, weight: 45 },   // 45% 機率
        { level: 4, weight: 10 },   // 10% 機率（降低出現機率）
      ],
    },
    {
      // 玩家等級 14-17：等級 3-4 混合，開始出現等級 5
      playerLevelRange: [14, 17],
      enemyLevels: [
        { level: 3, weight: 50 },   // 50% 機率
        { level: 4, weight: 35 },   // 35% 機率
        { level: 5, weight: 15 },   // 15% 機率（降低出現機率）
      ],
    },
    {
      // 玩家等級 18-21：等級 4-5 混合，開始少量出現等級 6
      playerLevelRange: [18, 21],
      enemyLevels: [
        { level: 4, weight: 45 },   // 45% 機率
        { level: 5, weight: 40 },   // 40% 機率
        { level: 6, weight: 15 },   // 15% 機率（降低出現機率）
      ],
    },
    {
      // 玩家等級 22-25：等級 5-6 混合，開始出現等級 7
      playerLevelRange: [22, 25],
      enemyLevels: [
        { level: 5, weight: 45 },   // 45% 機率
        { level: 6, weight: 40 },   // 40% 機率
        { level: 7, weight: 15 },   // 15% 機率（降低出現機率）
      ],
    },
    {
      // 玩家等級 26+：等級 6-7 混合，開始少量出現等級 8
      playerLevelRange: [26, 999],
      enemyLevels: [
        { level: 6, weight: 45 },   // 45% 機率
        { level: 7, weight: 40 },   // 40% 機率
        { level: 8, weight: 15 },   // 15% 機率（大幅降低最高等級出現機率）
      ],
    },
  ],
};

