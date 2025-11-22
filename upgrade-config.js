// 升級系統配置檔 - 企劃人員可直接修改此檔案調整平衡
// Upgrade System Configuration - Planners can modify this file directly

window.UPGRADE_CONFIG = {
  // ========== 等級與經驗值系統 ==========
  // 升級所需經驗值計算公式：baseExp * (level ^ expMultiplier)
  // 例如：baseExp=80, expMultiplier=1.3, level=2 時需要 80 * (2^1.3) = 200 經驗值
  leveling: {
    baseExp: 80,         // 基礎經驗值需求（降低從 100 到 80）
    expMultiplier: 1.3,  // 經驗值成長倍率（降低從 1.5 到 1.3，讓高等級升級更容易）
  },

  // ========== 怪物等級系統 ==========
  // 怪物等級範圍：1-8 級（對應 mob_1.png ~ mob_8.png）
  // 怪物屬性計算公式：
  // - 血量：baseHp + (level - 1) * hpPerLevel
  // - 傷害：baseDamage + (level - 1) * damagePerLevel
  // - 經驗值：baseExp * level
  enemyLevel: {
    minLevel: 1,        // 最低等級
    maxLevel: 8,        // 最高等級（從 10 改為 8）
    baseHp: 20,         // 等級 1 的基礎血量
    hpPerLevel: 20,     // 每級增加的血量（LV1: 20, LV8: 160）
    baseDamage: 35,     // 等級 1 的基礎傷害
    damagePerLevel: 7,   // 每級增加的傷害（LV1: 35, LV8: 84）
    baseExp: 10,        // 等級 1 的基礎經驗值（實際經驗值 = baseExp * level，LV1: 10, LV8: 80）
  },

  // 怪物等級隨時間/玩家等級提升規則
  // 計算公式：enemyLevel = baseLevel + Math.floor((gameTime / timeScale) + (playerLevel / levelScale))
  // 最終等級會被限制在 minLevel 和 maxLevel 之間
  enemyScaling: {
    baseLevel: 1,       // 基礎等級
    timeScale: 30000,   // 每 30 秒提升一個等級（毫秒）
    levelScale: 5,      // 每 5 級玩家等級提升一個怪物等級
  },

  // ========== 升級選項配置 ==========
  upgrades: {
    // 法師升級
    mage: {
      auraRange: {
        name: "施法範圍",
        description: "法師光環範圍 +{value} 像素",
        baseValue: 80,      // 基礎範圍（AURA_RADIUS）
        increment: 10,      // 每次升級增加的值
        maxLevel: 8,        // 最大等級
        icon: "mage.png",   // 圖示
      },
      auraDamage: {
        name: "施法傷害",
        description: "法師光環每幀傷害 +{value}",
        baseValue: 3,       // 基礎傷害（AURA_DAMAGE）
        increment: 3,       // 每次升級增加的值
        maxLevel: 5,
        icon: "mage.png",
      },
    },

    // 弓箭手升級
    archer: {
      arrowCount: {
        name: "弓箭數量",
        description: "每次攻擊發射箭矢數量 +{value}",
        baseValue: 1,       // 基礎數量
        increment: 1,       // 每次升級增加的值
        maxLevel: 3,
        icon: "archer.png",
      },
      arrowSpeed: {
        name: "射擊速度",
        description: "箭矢飛行速度 +{value}，射擊頻率提升",
        baseValue: 5,       // 基礎速度（PROJECTILE_SPEED）
        increment: 1,       // 每次升級增加的值
        maxLevel: 10,
        icon: "archer.png",
      },
    },

    // 騎士升級
    knight: {
      hitPoints: {
        name: "可被攻擊次數",
        description: "騎士可承受的攻擊次數 +{value}（初始為 1）",
        baseValue: 1,       // 基礎次數
        increment: 1,       // 每次升級增加的值
        maxLevel: 10,
        icon: "knight.png",
      },
      deathBonus: {
        name: "死亡後增加隊伍長度",
        description: "騎士死亡時隊伍長度 +{value}",
        baseValue: 0,       // 基礎值（0 表示沒有加成）
        increment: 1,       // 每次升級增加的值
        maxLevel: 3,
        icon: "knight.png",
      },
    },

    // 隊長升級
    leader: {
      maxHp: {
        name: "血量",
        description: "隊長最大血量 +{value}",
        baseValue: 150,     // 基礎血量（LEADER_MAX_HP）
        increment: 5,       // 每次升級增加的值
        maxLevel: 10,
        icon: "leader.png",
      },
      damage: {
        name: "傷害",
        description: "隊長撞擊敵人傷害 +{value}",
        baseValue: 0,       // 基礎傷害（0 表示沒有傷害，需要實作）
        increment: 5,       // 每次升級增加的值（從 1 改為 5）
        maxLevel: 5,       // 最大等級保持 5
        icon: "leader.png",
      },
      moveSpeed: {
        name: "移動速度",
        description: "隊長移動速度提升（移動間隔減少 {value} 毫秒）",
        baseValue: 200,     // 基礎移動間隔（GAME_SPEED，毫秒）
        increment: -15,     // 每次升級減少的值（負數表示減少間隔，即加快速度）
        maxLevel: 5,        // 最大等級 5
        icon: "leader.png",
      },
    },
  },

  // ========== 滿級後統一效果 ==========
  // 當所有選項都滿級後，每次升級統一增加隊長最大 HP
  maxedOutBonus: {
    hpIncrease: 1,  // 每次升級增加的最大 HP
  },
};

