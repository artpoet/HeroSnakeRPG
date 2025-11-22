/*
  勇者貪食蛇 RPG
  Copyright © 2025 Yupo Huang. All rights reserved.
  
  本遊戲及其所有代碼、資源、設計均為 Yupo Huang 的智慧財產權。
  未經授權，不得複製、修改、分發或商業使用。
*/

// 升級系統配置檔 - 企劃人員可直接修改此檔案調整平衡
// Upgrade System Configuration - Planners can modify this file directly

window.UPGRADE_CONFIG = {
  // ========== 等級與經驗值系統 ==========
  // 升級所需經驗值計算公式：baseExp * (level ^ expMultiplier)
  // 例如：baseExp=25, expMultiplier=1.1, level=2 時需要 25 * (2^1.1) = 54 經驗值
  leveling: {
    baseExp: 25,         // 基礎經驗值需求（從 40 降低到 25，讓升級更快更容易）
    expMultiplier: 1.1,  // 經驗值成長倍率（從 1.15 降低到 1.1，讓高等級升級更容易）
  },

  // ========== 怪物等級系統 ==========
  // 怪物等級範圍：1-8 級（對應 mob_1.png ~ mob_8.png）
  // 怪物屬性計算公式：
  // - 血量：baseHp + (level - 1) * hpPerLevel
  // - 傷害：baseDamage + (level - 1) * damagePerLevel
  // - 經驗值：baseExp * level * (1 + (level - 1) * 0.3)（非線性成長，高等級怪物經驗值更多）
  //   等級 1: 10, 等級 2: 26, 等級 3: 48, 等級 4: 76, 等級 5: 110, 等級 6: 150, 等級 7: 196, 等級 8: 248
  enemyLevel: {
    minLevel: 1,        // 最低等級
    maxLevel: 8,        // 最高等級（從 10 改為 8）
    baseHp: 20,         // 等級 1 的基礎血量
    hpPerLevel: 45,     // 每級增加的血量（LV1: 20, LV8: 335，從 30 增加到 45，大幅提升強度）
    baseDamage: 35,     // 等級 1 的基礎傷害
    damagePerLevel: 15,   // 每級增加的傷害（LV1: 35, LV8: 140，從 10 增加到 15）
    baseExp: 10,        // 等級 1 的基礎經驗值（實際經驗值使用非線性公式計算）
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
        increment: 15,     // 每次升級增加的值（從 10 改為 15）
        maxLevel: 8,        // 最大等級
        icon: "mage.png",   // 圖示
      },
      auraDamage: {
        name: "施法傷害",
        description: "法師光環每幀傷害 +{value}",
        baseValue: 3,       // 基礎傷害（AURA_DAMAGE）
        increment: 5,       // 每次升級增加的值（從 3 提升到 5）
        maxLevel: 8,        // 最大等級從 5 提升到 8
        icon: "mage.png",
      },
      scaleBonus: {
        name: "縮放效果",
        description: "法師縮放百分比 +{value}%（每兩秒一個縮放循環）",
        baseValue: 0,       // 基礎值（0 表示沒有縮放）
        increment: 10,      // 每次升級增加 10%
        maxLevel: 5,
        icon: "mage.png",
      },
      slowAura: {
        name: "降速光環",
        description: "光圈內的敵人速度 -{value}%",
        baseValue: 0,       // 基礎值（0 表示沒有降速）
        increment: 12,      // 每次升級減少 12% 速度
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
        maxLevel: 5,        // 等級上限從 3 上修為 5
        icon: "archer.png",
      },
      arrowSpeed: {
        name: "射擊速度",
        description: "箭矢飛行速度 +{value}，射擊頻率提升",
        baseValue: 5,       // 基礎速度（PROJECTILE_SPEED）
        increment: 1,       // 每次升級增加的值
        maxLevel: 8,        // 等級上限從 10 下修為 8
        icon: "archer.png",
      },
      explosion: {
        name: "箭矢爆炸",
        description: "命中怪物後爆炸範圍 +{value} 像素，傷害 +{damage}",
        baseValue: 0,       // 基礎值（0 表示沒有爆炸）
        increment: 50,      // 每次升級增加 50 像素範圍（從 30 增加 20）
        damageIncrement: 2, // 每次升級增加 2 點傷害（從 5 降低到 2，避免過強）
        maxLevel: 5,
        icon: "archer.png",
      },
      critical: {
        name: "必殺",
        description: "{value}% 發動致命一擊（每級傷害 +20%）",
        baseValue: 0,       // 基礎值（0 表示沒有必殺）
        increment: 5,       // 每次升級增加 5% 機率
        maxLevel: 10,
        icon: "archer.png",
      },
    },

    // 騎士升級
    knight: {
      recharge: {
        name: "聖光充能",
        description: "每擊殺 10 隻怪物，回復騎士 {value} 點血量",
        baseValue: 0,       // 基礎值
        increment: 1,       // 每次升級增加回復量（Lv1恢復1點, Lv5恢復5點）
        maxLevel: 5,
        icon: "knight.png",
      },
      deathBonus: {
        name: "死亡後招募勇者",
        description: "騎士死亡時隊伍長度 +{value}",
        baseValue: 0,       // 基礎值（0 表示沒有加成）
        increment: 2,       // 每次升級增加的值（從 1 改為 2）
        maxLevel: 3,
        icon: "knight.png",
      },
      explosion: {
        name: "受傷爆炸",
        description: "騎士受傷時爆炸範圍 +{value} 像素，傷害 +{damage}",
        baseValue: 0,       // 基礎值（0 表示沒有爆炸）
        increment: 70,      // 每次升級增加 70 像素範圍（從 40 增加 30）
        damageIncrement: 5, // 每次升級增加 5 點傷害（從 10 降低到 5，因為是受傷爆炸而非死亡爆炸）
        maxLevel: 8,
        icon: "knight.png",
      },
      invincibility: {
        name: "無敵",
        description: "受傷後 {value} 秒內所有我方角色對敵人攻擊無敵",
        baseValue: 0,       // 基礎值（0 表示沒有無敵）
        increment: 1,       // 每次升級增加 1 秒
        maxLevel: 5,
        icon: "knight.png",
      },
    },

    // 隊長升級
    leader: {
      maxHp: {
        name: "血量",
        description: "隊長最大血量額外 +{value}",
        baseValue: 150,     // 基礎血量（LEADER_MAX_HP）
        increment: 10,      // 每次升級增加的值（從 5 改為 10）
        maxLevel: 10,
        icon: "leader.png",
      },
      damage: {
        name: "傷害",
        description: "隊長撞擊敵人傷害 +{value}",
        baseValue: 0,       // 基礎傷害（0 表示沒有傷害，需要實作）
        increment: 10,      // 每次升級增加的值（從 5 提升到 10，增加誘惑力）
        maxLevel: 5,       // 最大等級保持 5
        icon: "leader.png",
      },
      moveSpeed: {
        name: "移動速度",
        description: "隊長移動速度提升（移動間隔減少 {value} 毫秒）",
        baseValue: 200,     // 基礎移動間隔（GAME_SPEED，毫秒）- 從 180 增加到 200，稍微變慢
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

  // ========== 能力類型限制 ==========
  // 每輪遊戲最多可選八種能力類型
  abilityTypeLimit: 8,  // 能力類型上限
};

