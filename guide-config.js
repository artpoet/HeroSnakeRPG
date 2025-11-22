// 快速指引配置檔 - 企劃人員可直接修改此檔案
// Guide Panel Configuration - Planners can modify this file directly

window.GUIDE_CONFIG = {
  tabs: [
    {
      id: "quick",
      title: "快速指引",
      content: {
        intro: "操作方式：WASD / 方向鍵控制，或使用滑鼠/手指拖曳移動。",
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
            description: "持續追著隊長跑，被擊倒時會回復隊長血量並累計擊殺數。"
          },
          {
            image: "item.png",
            alt: "道具圖示",
            name: "招募勇者",
            description: "吃到就會延長隊伍並隨機加入新職業。偶爾也可指定職業。"
          }
        ]
      }
    },
    {
      id: "advanced",
      title: "進階規則",
      html: `
        <div class="advanced-rules">
          <h3>勇者合成與升級</h3>
          <p>當隊伍中有足夠數量的<strong>相同職業與等級</strong>勇者時，會自動合成升級！</p>
          <ul class="rule-list">
            <li><strong>3 隻 Lv.1</strong> → 合成 <strong>1 隻 Lv.2</strong></li>
            <li><strong>4 隻 Lv.2</strong> → 合成 <strong>1 隻 Lv.3</strong></li>
            <li><strong>5 隻 Lv.3</strong> → 合成 <strong>1 隻 Lv.MAX</strong></li>
          </ul>
          <p class="highlight-text">合成後勇者會補滿狀態，並獲得大幅能力提升！</p>
          
          <h3>職業升級效果</h3>
          <div class="role-rule">
            <strong>弓箭手 (Archer)</strong>
            <p>傷害隨等級線性提升 (5 &gt; 10 &gt; 15 &gt; 20)。<br>升級可解鎖：多重箭矢、射速提升、爆炸箭、致命一擊。</p>
          </div>
          <div class="role-rule">
            <strong>法師 (Mage)</strong>
            <p>光環傷害隨等級倍數提升 (3 &gt; 6 &gt; 12 &gt; 24)。<br>升級可解鎖：範圍擴大、傷害強化、光環縮放、降速光環。</p>
          </div>
          <div class="role-rule">
            <strong>騎士 (Knight)</strong>
            <p>血量隨等級倍數提升 (2 &gt; 4 &gt; 8 &gt; 16)。<br>升級可解鎖：聖光充能(擊殺回血)、受傷爆炸、無敵護盾。</p>
          </div>
        </div>
      `
    }
  ]
};

