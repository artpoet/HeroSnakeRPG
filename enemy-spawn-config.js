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
      // 玩家等級 3-4：等級 1-2 混合，開始出現等級 2
      playerLevelRange: [3, 4],
      enemyLevels: [
        { level: 1, weight: 60 },   // 60% 機率
        { level: 2, weight: 40 },   // 40% 機率
      ],
    },
    {
      // 玩家等級 5-6：等級 2-4 混合
      playerLevelRange: [5, 6],
      enemyLevels: [
        { level: 2, weight: 50 },   // 50% 機率
        { level: 3, weight: 35 },   // 35% 機率
        { level: 4, weight: 15 },   // 15% 機率
      ],
    },
    {
      // 玩家等級 7-8：等級 3-5 混合
      playerLevelRange: [7, 8],
      enemyLevels: [
        { level: 3, weight: 40 },   // 40% 機率
        { level: 4, weight: 40 },   // 40% 機率
        { level: 5, weight: 20 },   // 20% 機率
      ],
    },
    {
      // 玩家等級 9-10：等級 4-6 混合
      playerLevelRange: [9, 10],
      enemyLevels: [
        { level: 4, weight: 35 },   // 35% 機率
        { level: 5, weight: 35 },   // 35% 機率
        { level: 6, weight: 30 },   // 30% 機率
      ],
    },
    {
      // 玩家等級 11-12：等級 5-7 混合，開始出現高等級
      playerLevelRange: [11, 12],
      enemyLevels: [
        { level: 5, weight: 30 },   // 30% 機率
        { level: 6, weight: 30 },   // 30% 機率
        { level: 7, weight: 25 },   // 25% 機率
        { level: 8, weight: 15 },   // 15% 機率
      ],
    },
    {
      // 玩家等級 13+：等級 6-8 混合，以高等級為主
      playerLevelRange: [13, 999],
      enemyLevels: [
        { level: 6, weight: 25 },   // 25% 機率
        { level: 7, weight: 30 },   // 30% 機率
        { level: 8, weight: 45 },   // 45% 機率（最高等級）
      ],
    },
  ],
};

