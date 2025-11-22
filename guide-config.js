// 快速指引配置檔 - 企劃人員可直接修改此檔案
// Guide Panel Configuration - Planners can modify this file directly

window.GUIDE_CONFIG = {
  // 標題（移除快速指引）
  title: "",
  
  // 開場說明文字（改為操作方式，移到最前面）
  intro: "操作方式：WASD / 方向鍵控制，或使用滑鼠/手指拖曳移動；保持隊伍迴旋可避開敵人。",
  
  // 角色/物品列表
  items: [
    {
      image: "leader.png",
      alt: "隊長圖示",
      name: "隊長",
      description: "由你操控的領隊，血量歸零或撞擊牆壁與隊伍將會失敗，擊殺怪物可以回血。"
    },
    {
      image: "archer.png",
      alt: "弓箭手圖示",
      name: "弓箭手",
      description: "自動鎖定射程內最近敵人，提供穩定輸出。"
    },
    {
      image: "mage.png",
      alt: "法師圖示",
      name: "法師",
      description: "藍色光環持續灼燒附近敵人，靠近時別忘了留退路。"
    },
    {
      image: "knight.png",
      alt: "騎士圖示",
      name: "騎士",
      description: "隊伍的保險絲，敵人撞到任何人時會優先犧牲騎士。"
    },
    {
      image: "enemy.png",
      alt: "敵人圖示",
      name: "敵人",
      description: "持續追著隊長跑，被擊倒時會補血並累計擊殺數。"
    },
    {
      image: "item.png",
      alt: "道具圖示",
      name: "招募勇者",
      description: "吃到就會延長隊伍並隨機加入新職業。"
    }
  ],
  
  // 操作提示文字（移除，已移到 intro）
  tip: ""
};

