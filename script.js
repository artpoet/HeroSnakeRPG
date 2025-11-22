const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 介面元素
const scoreValue = document.getElementById("scoreValue");
const killValue = document.getElementById("killValue");
const playerLevel = document.getElementById("playerLevel");
const expText = document.getElementById("expText");
const expBarFill = document.getElementById("expBarFill");

// Screens & Modals
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const upgradeOverlay = document.getElementById("upgradeOverlay");
const upgradeOptions = document.getElementById("upgradeOptions");
const gameOverOverlay = document.getElementById("gameOverOverlay");

// Buttons
const pauseBtn = document.getElementById("pauseBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const guideBtn = document.getElementById("guideBtn");

// Modal References
const leaderboardModal = document.getElementById("leaderboardModal");
const guideModal = document.getElementById("guideModal");
const pauseModal = document.getElementById("pauseModal");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = document.getElementById("countdownNumber");

// Minimap
const minimapCanvas = document.getElementById("minimap");
const minimapCtx = minimapCanvas ? minimapCanvas.getContext("2d") : null;

// ========== 遊戲常數與變數 ==========

// 世界大小 (以 GRID_SIZE 為單位的格數)
// 定義在 index.html: const WORLD_WIDTH_GRIDS = 60; const WORLD_HEIGHT_GRIDS = 60;
const WORLD_WIDTH_PX = WORLD_WIDTH_GRIDS * GRID_SIZE;
const WORLD_HEIGHT_PX = WORLD_HEIGHT_GRIDS * GRID_SIZE;

// 遊戲縮放比例 (手機版視野拉遠)
let GAME_SCALE = 1.0;
function updateGameScale() {
    // 當螢幕寬度小於 768px (平板/手機) 時，縮小畫面 (拉遠視野)
    // 0.75 表示視野範圍擴大約 33%
    GAME_SCALE = window.innerWidth < 768 ? 0.75 : 1.0;
}
// 初始化並監聽視窗大小變化
updateGameScale();
window.addEventListener('resize', updateGameScale);

// Camera 物件
const camera = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  
  // 更新 Camera 位置，使其跟隨目標 (targetX, targetY 是像素座標)
  update(targetX, targetY) {
    // 考慮縮放比例計算可視範圍
    this.width = canvas.width / GAME_SCALE;
    this.height = canvas.height / GAME_SCALE;

    // 讓目標位於畫面中心
    this.x = targetX - this.width / 2;
    this.y = targetY - this.height / 2;
    
    // 邊界限制 (Clamping)
    this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH_PX - this.width));
    this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT_PX - this.height));
  },
  
  // 世界座標轉螢幕座標
  transform(x, y) {
    return { x: x - this.x, y: y - this.y };
  }
};

// 遊戲狀態
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let facing = 1;
let items = []; // 道具陣列（多個道具）
// 根據地圖大小動態計算道具數量：60x60 地圖，每 400 格一個道具
const MAX_ITEMS = Math.max(8, Math.floor((WORLD_WIDTH_GRIDS * WORLD_HEIGHT_GRIDS) / 400));
let recruitQueue = [];
let enemies = [];
let projectiles = [];
let effects = []; // 視覺特效
let touchTrails = []; // 觸控軌跡點

let lastMoveTime = 0;
let lastEnemySpawn = 0;
let isGameOver = false;
let isPaused = false;
let isCountdown = false;
let isChoosingUpgrade = false;
let animationId = null;

// 玩家數據
// LEADER_MAX_HP 定義在 index.html，如果未定義則使用預設值 150
let leaderHP = typeof LEADER_MAX_HP !== 'undefined' ? LEADER_MAX_HP : 150;
let killCount = 0;
let maxLengthThisRun = 1;
let playerLevelValue = 1;
let playerExp = 0;
let maxLevelThisRun = 1;
let gameStartTime = 0;

// 升級狀態
let upgradeLevels = {
  mage: { auraRange: 0, auraDamage: 0, scaleBonus: 0, slowAura: 0 },
  archer: { arrowCount: 0, arrowSpeed: 0, explosion: 0, critical: 0 },
  knight: { recharge: 0, deathBonus: 0, explosion: 0, invincibility: 0 },
  leader: { maxHp: 0, damage: 0, moveSpeed: 0 },
};

// 能力類型追蹤（追蹤已解鎖的能力類型）
let unlockedAbilityTypes = new Set(); // 使用 Set 追蹤已解鎖的能力類型 (role.key 格式)
let knightKillCounter = 0; // 騎士擊殺計數器（用於充能）

// 資源載入
let assetsLoaded = 0;
let assetsReady = false;
const assetDefinitions = {
  leader: { src: "leader.png", fallbackColor: "#ef4444", fallbackSymbol: "👑" },
  archer: { src: "archer.png", fallbackColor: "#22c55e", fallbackSymbol: "🏹" },
  mage: { src: "mage.png", fallbackColor: "#3b82f6", fallbackSymbol: "🔮" },
  knight: { src: "knight.png", fallbackColor: "#facc15", fallbackSymbol: "🛡️" },
  item: { src: "item.png", fallbackColor: "#a855f7", fallbackSymbol: "🎁" },
};

// 怪物圖片資源（根據等級載入對應圖片）
const enemyAssetDefinitions = {};
for (let level = 1; level <= 8; level++) {
  enemyAssetDefinitions[`mob_${level}`] = {
    src: `mob_${level}.png`,
    fallbackColor: "#efefef",
    fallbackSymbol: "💀"
  };
}

// 合併所有資源定義
const allAssetDefinitions = { ...assetDefinitions, ...enemyAssetDefinitions };
const TOTAL_ASSETS = Object.keys(allAssetDefinitions).length;
const ASSETS = {};

// ========== 初始化與資源載入 ==========

function createAsset(key, def) {
  const img = new Image();
  img.src = def.src;
  
  const asset = {
    img: img,
    loaded: false,
    decoded: false, // 標記是否已解碼
    draw(ctx, x, y, size, facing = 1) {
      if (this.loaded) {
        if (facing === -1) {
          ctx.save();
          ctx.translate(x + size, y);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, size, size);
          ctx.restore();
        } else {
          ctx.drawImage(img, x, y, size, size);
        }
      } else {
        // Fallback drawing
        ctx.fillStyle = def.fallbackColor;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = "#fff";
        ctx.font = `${size/2}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(def.fallbackSymbol, x + size/2, y + size/2);
      }
    }
  };

  img.onload = () => {
    asset.loaded = true;
    
    // 預先解碼圖片，避免第一次繪製時卡頓
    // 使用 decode() API（如果支援）或離屏 Canvas 強制解碼
    if (img.decode) {
      // 使用現代瀏覽器的 decode() API
      img.decode().then(() => {
        // 即使 decode() 成功，也進行一次實際尺寸的預繪製
        // 確保瀏覽器真正完成解碼（某些瀏覽器需要）
        forceDecodeWithCanvas(img, asset);
      }).catch(() => {
        // 如果 decode() 失敗，使用離屏 Canvas 解碼
        decodeImageWithCanvas(img, asset);
      });
    } else {
      // 舊瀏覽器：使用離屏 Canvas 解碼
      decodeImageWithCanvas(img, asset);
    }
  };
  
  img.onerror = () => {
    asset.loaded = false; // Keep using fallback
    assetsLoaded++; // Still count as handled
    updateLoader();
  };
  
  return asset;
}

// 使用離屏 Canvas 預先解碼圖片（用於舊瀏覽器或不支援 decode() 的情況）
function decodeImageWithCanvas(img, asset) {
  forceDecodeWithCanvas(img, asset);
}

// 強制在實際尺寸下解碼圖片（通用函數）
function forceDecodeWithCanvas(img, asset) {
  try {
    // 使用實際圖片尺寸進行解碼，確保瀏覽器完全解碼圖片
    // 這樣可以避免第一次繪製時的卡頓
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = img.width || GRID_SIZE;
    offscreenCanvas.height = img.height || GRID_SIZE;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    
    // 繪製圖片到離屏 Canvas，強制瀏覽器解碼
    offscreenCtx.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
    // 使用 requestAnimationFrame 確保解碼完成
    // 這讓瀏覽器有時間真正完成圖片解碼
    requestAnimationFrame(() => {
      // 再次繪製一次，確保解碼完成（某些瀏覽器需要）
      try {
        offscreenCtx.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        // 讀取像素數據，強制完成解碼
        offscreenCtx.getImageData(0, 0, 1, 1);
      } catch (e) {
        // 忽略錯誤，繼續標記為已解碼
      }
      
      asset.decoded = true;
      assetsLoaded++;
      updateLoader();
    });
  } catch (e) {
    // 如果解碼失敗，仍然標記為已載入
    asset.decoded = true;
    assetsLoaded++;
    updateLoader();
  }
}

// 勇者幹話陣列（從 hero-quotes-config.js 載入）
const heroQuotes = window.HERO_QUOTES || [
  "勇者準備就緒！", // 預設值（如果配置文件未載入）
];

let quoteShown = false; // 標記名言是否已顯示

function getRandomQuote() {
  if (!heroQuotes || heroQuotes.length === 0) {
    return "勇者準備就緒！";
  }
  return heroQuotes[Math.floor(Math.random() * heroQuotes.length)];
}

function updateLoader() {
  const percent = Math.floor((assetsLoaded / TOTAL_ASSETS) * 100);
  const loaderBar = document.getElementById("loaderBar");
  const loaderText = document.getElementById("loaderText");
  const heroQuote = document.getElementById("heroQuote");
  const quoteText = document.getElementById("quoteText");
  const loaderBarContainer = loaderBar?.parentElement;
  
  if (loaderBar) loaderBar.style.width = `${percent}%`;
  
  // 100% 時切換到名言顯示（只顯示一次）
  if (percent >= 100 && !quoteShown) {
    if (loaderText) loaderText.classList.add("hidden");
    if (loaderBarContainer) loaderBarContainer.classList.add("hidden");
    if (heroQuote) {
      heroQuote.classList.remove("hidden");
      if (quoteText) {
        quoteText.textContent = getRandomQuote();
      }
    }
    quoteShown = true;
  } else if (percent < 100) {
    if (loaderText) {
      loaderText.innerText = `勇者準備中... ${percent}%`;
      loaderText.classList.remove("hidden");
    }
    if (loaderBarContainer) loaderBarContainer.classList.remove("hidden");
    if (heroQuote) heroQuote.classList.add("hidden");
  }

  // 所有資產載入完成後，顯示主選單（但保持載入畫面顯示名言）
  if (assetsLoaded >= TOTAL_ASSETS) {
    const homeMenu = document.getElementById("homeMenu");
    if (homeMenu) {
      homeMenu.classList.remove("hidden");
    }
    finishLoading();
  }
}

function finishLoading() {
  assetsReady = true;
  // 載入畫面已在 updateLoader 中隱藏（100% 時）
  const homeMenu = document.getElementById("homeMenu");
  if (homeMenu) homeMenu.classList.remove("hidden");

  // Auto-fill name
  const savedName = localStorage.getItem("playerName");
  const input = document.getElementById("homePlayerNameInput");
  if (savedName && input) input.value = savedName;

  resizeCanvas();
}

// 初始化資產
// 初始化所有資產（包括怪物圖片）
for (const [key, def] of Object.entries(allAssetDefinitions)) {
  ASSETS[key] = createAsset(key, def);
}

// ========== 視窗大小與 Camera ==========

function resizeCanvas() {
  const HUD_HEIGHT = 136; // HUD 區域高度（120px 地圖 + 16px padding）
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - HUD_HEIGHT; // 減去 HUD 區域高度
  
  camera.width = canvas.width;
  camera.height = canvas.height;

  // 確保渲染清晰
  ctx.imageSmoothingEnabled = false;
}

window.addEventListener("resize", resizeCanvas);

// ========== 遊戲核心邏輯 ==========

function startGame() {
  if (!assetsReady) return;

  // 切換畫面
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  gameOverOverlay.classList.add("hidden");
  
  // 初始化變數
  resizeCanvas();
  
  // 初始位置在世界中心
  const startX = Math.floor(WORLD_WIDTH_GRIDS / 2);
  const startY = Math.floor(WORLD_HEIGHT_GRIDS / 2);
  
  snake = [{
      x: startX,
      y: startY,
    renderX: startX,
      renderY: startY,
    targetRenderX: startX,
    targetRenderY: startY,
      role: "leader",
    facing: 1,
    id: 0,
    lastShot: 0
  }];
  
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  facing = 1;
  
  enemies = [];
  projectiles = [];
  effects = [];
  items = [];
  // 初始化多個道具
  for (let i = 0; i < MAX_ITEMS; i++) {
    items.push(spawnItem());
  }
  
  isGameOver = false;
  isPaused = false;
  isCountdown = false;
  isChoosingUpgrade = false;
  
  // 確保倒數計時是隱藏的
  if (countdownOverlay) {
    countdownOverlay.classList.add("hidden");
  }
  
  leaderHP = 150; // 預設，會被 getLeaderMaxHp 覆蓋
  killCount = 0;
  maxLengthThisRun = 1;
  playerLevelValue = 1;
  playerExp = 0;
  gameStartTime = Date.now();
  
  // 重置 UI
  scoreValue.textContent = "1";
  killValue.textContent = "0";
  updateLevelUI();
  
  // 重置升級
  upgradeLevels = {
    mage: { auraRange: 0, auraDamage: 0, scaleBonus: 0, slowAura: 0 },
    archer: { arrowCount: 0, arrowSpeed: 0, explosion: 0, critical: 0 },
    knight: { recharge: 0, deathBonus: 0, explosion: 0, invincibility: 0 },
    leader: { maxHp: 0, damage: 0, moveSpeed: 0 },
  };
  unlockedAbilityTypes = new Set(); // 重置能力類型追蹤
  updateAbilityTypeUI(); // 更新能力類型 UI 顯示
  leaderHP = getLeaderMaxHp();

  // 初始化時間戳記，確保第一次移動能立即執行
  lastMoveTime = 0;
  lastEnemySpawn = 0;
  mageScaleStartTime = performance.now(); // 重置法師縮放時間
  invincibilityEndTime = 0; // 重置無敵狀態
  
  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function spawnItem() {
  let x, y;
  let attempts = 0;
  do {
    x = Math.floor(Math.random() * WORLD_WIDTH_GRIDS);
    y = Math.floor(Math.random() * WORLD_HEIGHT_GRIDS);
    attempts++;
  } while (isOccupied(x, y) && attempts < 100);
  
  // 指定職業邏輯：場上固定各職業指定道具各兩個
  const roles = ["archer", "mage", "knight"];
  const roleCounts = { archer: 0, mage: 0, knight: 0 };
  
  items.forEach(item => {
      if (item && item.role) {
          roleCounts[item.role] = (roleCounts[item.role] || 0) + 1;
      }
  });
  
  // 找出數量不足 2 的職業
  const availableRoles = roles.filter(r => roleCounts[r] < 2);
  
  let selectedRole = undefined;
  
  if (availableRoles.length > 0) {
      // 優先生成缺少的指定職業道具
      // 隨機選一個缺少的職業，避免總是按順序生成
      selectedRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
  }
  // 如果都不缺 (availableRoles 為空)，selectedRole 維持 undefined (生成隨機道具)
  
  return { x, y, role: selectedRole };
}

function isOccupied(x, y) {
  return snake.some(s => s.x === x && s.y === y);
}

function spawnEnemy() {
    // 根據升級設定計算敵人屬性 (簡化版，完整邏輯保留原 script.js 的複雜計算)
    const level = calculateEnemyLevel();
    const config = getEnemyLevelConfig(level);
    
    // 在視窗外、世界內生成敵人
    // 簡單邏輯：在 Camera 範圍外隨機生成
    let ex, ey;
    let attempts = 0;
    // 定義安全距離 (視窗邊緣外 2 格)
    const safeMargin = 2 * GRID_SIZE; 
    
    do {
        ex = Math.floor(Math.random() * WORLD_WIDTH_GRIDS) * GRID_SIZE + GRID_SIZE/2;
        ey = Math.floor(Math.random() * WORLD_HEIGHT_GRIDS) * GRID_SIZE + GRID_SIZE/2;
        
        // 檢查是否在 camera 視野內 (如果是，則重試)
        const inView = (
            ex > camera.x - safeMargin && 
            ex < camera.x + camera.width + safeMargin &&
            ey > camera.y - safeMargin &&
            ey < camera.y + camera.height + safeMargin
        );
        if (!inView) break;
        
        attempts++;
    } while(attempts < 50);

  enemies.push({
        x: ex,
        y: ey,
        hp: config.hp,
        maxHp: config.hp,
        damage: config.damage,
        exp: config.exp,
        level: level,
    hitTimer: 0,
    hpTextTimer: 0,
        lastAuraHit: 0, // 上次被法師光環傷害的時間戳記
        lastCollisionTime: 0 // 上次碰撞的時間戳記
    });
}

// 敵人屬性計算 (保留原邏輯的核心)
function calculateEnemyLevel() {
    if (!window.ENEMY_SPAWN_CONFIG) return 1;
    const spawnConfig = window.ENEMY_SPAWN_CONFIG.spawnByPlayerLevel;
    let currentConfig = spawnConfig.find(c => 
        playerLevelValue >= c.playerLevelRange[0] && playerLevelValue <= c.playerLevelRange[1]
    ) || spawnConfig[spawnConfig.length - 1];
    
    // Weighted random
    const totalWeight = currentConfig.enemyLevels.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    for (const el of currentConfig.enemyLevels) {
        random -= el.weight;
        if (random <= 0) return el.level;
    }
    return 1;
}

function getEnemyLevelConfig(level) {
    const base = window.UPGRADE_CONFIG?.enemyLevel || { baseHp: 20, hpPerLevel: 20, baseDamage: 35, damagePerLevel: 7, baseExp: 10 };
    // 經驗值非線性成長：等級越高，經驗值成長越快
    // 公式：baseExp * level * (1 + (level - 1) * 0.3)
    // 等級 1: 10, 等級 2: 26, 等級 3: 48, 等級 4: 76, 等級 5: 110, 等級 6: 150, 等級 7: 196, 等級 8: 248
    const expMultiplier = 1 + (level - 1) * 0.3;
    const exp = Math.floor(base.baseExp * level * expMultiplier);
    
    // 血量計算：強化成長曲線，讓 Lv2 之後的怪物明顯變強
    // 公式：基礎血量 + (等級加成 * 成長係數)
    // 成長係數會隨著等級提高，讓血量呈指數級增長
    
    // 成長係數：每級額外增加 15% 的成長幅度
    const growthFactor = 1 + (level - 1) * 0.15;
    
    // 計算血量
    let hp = base.baseHp + (level - 1) * base.hpPerLevel * growthFactor;
    
    // 確保是整數
    hp = Math.floor(hp);
    
    return {
        hp: hp,
        damage: base.baseDamage + (level - 1) * base.damagePerLevel,
        exp: exp
    };
}

// 獲取升級數值 helper
function getUpgradedValue(role, key, defaultVal) {
    if (!window.UPGRADE_CONFIG) return defaultVal;
    const upgrade = window.UPGRADE_CONFIG.upgrades[role]?.[key];
    if (!upgrade) return defaultVal;
    const lvl = upgradeLevels[role][key] || 0;
    return upgrade.baseValue + (lvl * upgrade.increment);
}
function getLeaderMaxHp() { return getUpgradedValue("leader", "maxHp", 150); }

// 獲取當前移動速度（考慮升級）
function getCurrentMoveSpeed() {
  return getUpgradedValue("leader", "moveSpeed", GAME_SPEED);
}

function moveSnake(timestamp) {
  direction = nextDirection;
  
  // 更新面向
  if (direction.x !== 0) facing = direction.x;
  
  const head = snake[0];
  const nextX = head.x + direction.x;
  const nextY = head.y + direction.y;

  // 邊界檢查 (World Bounds)
  if (nextX < 0 || nextX >= WORLD_WIDTH_GRIDS || nextY < 0 || nextY >= WORLD_HEIGHT_GRIDS) {
    triggerGameOver();
    return;
  }
  
  // 自身碰撞
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === nextX && snake[i].y === nextY) {
        // 騎士守護邏輯 (簡化)
        const knightIdx = snake.findIndex(s => s.role === "knight");
        if (knightIdx !== -1 && knightIdx !== i) {
            // 騎士犧牲... (這裡為簡化，暫時直接 GameOver，完整邏輯需參考原 script)
            // 為了重構重點在渲染，這裡先保留基本碰撞
            triggerGameOver(); 
            return;
        }
        triggerGameOver();
        return;
    }
  }
  
  // 記錄舊位置用於插值
  const prevPositions = snake.map(s => ({...s}));
  
  // 移動身體
  for (let i = snake.length - 1; i > 0; i--) {
    snake[i].x = snake[i-1].x;
    snake[i].y = snake[i-1].y;
    // 面向跟隨
    snake[i].facing = (snake[i].x > prevPositions[i].x) ? 1 : (snake[i].x < prevPositions[i].x) ? -1 : snake[i].facing;
  }
  
  // 移動頭部
  head.x = nextX;
  head.y = nextY;
  head.facing = facing;
  
  // 更新目標位置，並記錄起始位置用於線性插值
  snake.forEach((s, i) => {
      // 記錄插值起始位置（當前的 renderX/Y）
      s.startRenderX = s.renderX;
      s.startRenderY = s.renderY;
      // 設置新的目標位置
      s.targetRenderX = s.x;
      s.targetRenderY = s.y;
  });
  
  // 檢查道具（檢查所有道具）
  const collectedItemIndex = items.findIndex(it => it && head.x === it.x && head.y === it.y);
  if (collectedItemIndex !== -1) {
      const item = items[collectedItemIndex];
      const itemPixelX = item.x * GRID_SIZE + GRID_SIZE/2;
      const itemPixelY = item.y * GRID_SIZE + GRID_SIZE/2;
      
      handleItemCollection(item.role); // 傳遞道具職業
      
      // 添加道具收集特效
      // 1. 光環擴散效果（黃白色）
      effects.push({
          type: "item-collect",
          x: itemPixelX,
          y: itemPixelY,
          radius: 0,
          maxRadius: GRID_SIZE * 1.5,
          alpha: 0.8,
          life: 20,
          color: "#facc15" // 亮黃色，開心一點
      });
      
      // 2. 星星粒子效果（多個小星星向外擴散，白色）
      for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          const speed = 2;
          effects.push({
              type: "item-star",
              x: itemPixelX,
              y: itemPixelY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 4,
              alpha: 1,
              life: 15,
              color: "#ffffff" // 白色，更明顯
          });
      }
      
      // 3. 文字特效（+1）
      effects.push({
          type: "text",
          text: "+1",
          x: itemPixelX,
          y: itemPixelY,
          life: 30,
          color: "#4ade80"
      });
      
      // 移除收集的道具，生成新的
      items[collectedItemIndex] = spawnItem();
  }
}

function handleItemCollection(specifiedRole) {
    // 使用指定職業，如果沒有則隨機招募（作為 fallback）
    let role = specifiedRole;
    if (!role) {
        const types = ["archer", "mage", "knight"];
        role = types[Math.floor(Math.random() * types.length)];
    }
    const tail = snake[snake.length - 1];
    
    const newSegment = {
        x: tail.x, y: tail.y,
        renderX: tail.x, renderY: tail.y,
        targetRenderX: tail.x,
        targetRenderY: tail.y,
        role: role,
        facing: tail.facing,
        id: Date.now(),
        lastShot: 0,
        level: 1 // 初始等級為 1
    };
    
    // 如果是騎士，初始化 hitPoints
    if (role === "knight") {
        newSegment.hitPoints = getKnightHitPoints(1); // Lv1 的血量
    }
    
    snake.push(newSegment);
    
    // 不需要在這裡生成新道具，已在收集時處理
    scoreValue.innerText = snake.length;
    maxLengthThisRun = Math.max(maxLengthThisRun, snake.length);
    
    // 視覺特效（文字特效已在收集道具時添加，這裡不需要重複）
}

// 檢查並合成勇者
function checkHeroMerge() {
    if (snake.length < 3) return; // 至少要有隊長 + 2 個隊員才可能合成
    
    // 全局統計各職業各等級的索引
    const groups = {}; // key: "role_level", value: [index1, index2, ...]
    
  for (let i = 1; i < snake.length; i++) {
        const s = snake[i];
        // 確保等級存在
        if (!s.level) s.level = 1;
        const level = s.level;
        
        if (level >= 4) continue; // 已滿級不參與合成
        
        const key = `${s.role}_${level}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(i);
    }
    
    // 檢查是否滿足合成條件
    // 3 個 Lv1 -> Lv2
    // 4 個 Lv2 -> Lv3
    // 5 個 Lv3 -> Lv4
    
    for (const key in groups) {
        const indices = groups[key];
        const [role, levelStr] = key.split('_');
        const level = parseInt(levelStr);
        
        let needed = 0;
        if (level === 1) needed = 3;
        else if (level === 2) needed = 4;
        else if (level === 3) needed = 5;
        
        if (indices.length >= needed) {
            // 執行合成！
            // 保留最前面的 (index 最小的)，即 indices[0]
            const baseIdx = indices[0];
            const base = snake[baseIdx];
            
            // 升級
            const newLevel = level + 1;
            base.level = newLevel;
            
            // 更新騎士血量（補滿）
            if (base.role === "knight") {
                base.hitPoints = getKnightHitPoints(base.level);
            }
            
            // 特效：在合併位置顯示等級
            effects.push({
                type: "text",
                text: newLevel >= 4 ? "Lv.MAX" : `Lv.${newLevel}`,
                x: base.renderX * GRID_SIZE,
                y: base.renderY * GRID_SIZE - 30,
                color: "#FFD700", // 金色
                life: 60,
                vy: -0.5,
                fontSize: 24,
                fontWeight: "bold"
            });
            
            // 添加升級特效 (角色變白 + 升級白光)
            base.levelUpTimer = 40; 
            
             effects.push({
                type: "merge-flash", 
                x: base.renderX * GRID_SIZE + GRID_SIZE/2,
                y: base.renderY * GRID_SIZE + GRID_SIZE/2,
                life: 20,
                color: "#FFFFFF",
                radius: GRID_SIZE
            });
            
            // 移除其他參與合成的
            // 標記要移除的索引
            const toRemove = indices.slice(1, needed);
            
            // 對 toRemove 進行排序（從大到小），然後 splice
            toRemove.sort((a, b) => b - a);
            toRemove.forEach(idx => {
                snake.splice(idx, 1);
            });
            
            // 更新分數
            scoreValue.textContent = snake.length;
            
            return; // 一次只處理一個合併
        }
    }
}

// Game Loop
function gameLoop(timestamp) {
  if (isGameOver) return;
  
  if (isPaused || isCountdown || isChoosingUpgrade) {
      draw();
      requestAnimationFrame(gameLoop);
      return;
  }

  // 邏輯更新頻率控制（使用升級後的移動速度）
  if (!lastMoveTime) lastMoveTime = timestamp;
  const currentMoveSpeed = getCurrentMoveSpeed();
  if (timestamp - lastMoveTime >= currentMoveSpeed) {
    moveSnake(timestamp);
    checkHeroMerge(); // 檢查是否可以合成勇者
    lastMoveTime = timestamp;
  }
  
  if (!lastEnemySpawn) lastEnemySpawn = timestamp;
  
  if (timestamp - lastEnemySpawn >= ENEMY_SPAWN_RATE) {
      spawnEnemy();
      lastEnemySpawn = timestamp;
  }
  
  // 更新我方單位的受傷閃爍計時器（在邏輯更新階段，不在繪製階段）
  snake.forEach(s => {
      if (s.hitTimer !== undefined && s.hitTimer > 0) {
          s.hitTimer--;
      }
  });
  
  // Lerp 平滑移動（每幀執行，讓移動更流暢）
  // 使用線性插值：根據經過的時間百分比直接計算位置
  const timeSinceMove = timestamp - lastMoveTime;
  const moveProgress = Math.min(timeSinceMove / currentMoveSpeed, 1); // 0.0 到 1.0
  
  snake.forEach(s => {
      if (s.targetRenderX !== undefined && s.startRenderX !== undefined) {
          // 使用線性插值：從起始位置到目標位置
          // 不使用指數衰減，而是直接根據時間進度計算位置
          s.renderX = s.startRenderX + (s.targetRenderX - s.startRenderX) * moveProgress;
          s.renderY = s.startRenderY + (s.targetRenderY - s.startRenderY) * moveProgress;
          
          // 應用回彈速度（如果存在）- 回彈效果疊加在平滑移動上
          if (s.bounceVx !== undefined && s.bounceVx !== 0) {
              s.renderX += s.bounceVx;
              s.bounceVx *= 0.95; // 更快衰減
              if (Math.abs(s.bounceVx) < 0.001) s.bounceVx = 0;
          }
          if (s.bounceVy !== undefined && s.bounceVy !== 0) {
              s.renderY += s.bounceVy;
              s.bounceVy *= 0.95; // 更快衰減
              if (Math.abs(s.bounceVy) < 0.001) s.bounceVy = 0;
          }
          
          // 限制 renderX/Y 在邊界內，避免在邊界附近時視覺不協調
          // 這確保 Camera 的邊界限制和玩家的視覺位置保持一致
          s.renderX = Math.max(0, Math.min(s.renderX, WORLD_WIDTH_GRIDS - 1));
          s.renderY = Math.max(0, Math.min(s.renderY, WORLD_HEIGHT_GRIDS - 1));
      }
  });
  
  // 更新 Camera
  const head = snake[0];
  // 目標點是頭部的像素中心
  const targetCamX = head.renderX * GRID_SIZE + GRID_SIZE / 2;
  const targetCamY = head.renderY * GRID_SIZE + GRID_SIZE / 2;
  camera.update(targetCamX, targetCamY);
  
  // 其他邏輯更新 (Projectiles, Enemies, Collisions)
  handleArcherAttacks(timestamp);
  handleMageAura(timestamp);
  updateProjectiles();
  updateEnemies(head); // 傳入 head 用於追蹤
  
  draw();
  
  animationId = requestAnimationFrame(gameLoop);
}

function updateEnemies(target) {
    // 敵人移動邏輯 (簡單追蹤)
    const targetPixelX = target.renderX * GRID_SIZE + GRID_SIZE/2;
    const targetPixelY = target.renderY * GRID_SIZE + GRID_SIZE/2;
    
    enemies.forEach(e => {
        if (e.hp <= 0 || e.dead) return;
        
        // 更新緩停計時器
        if (e.stunTimer !== undefined && e.stunTimer > 0) {
            e.stunTimer--;
        }
        
        // 只有在沒有緩停時才移動
        if (!e.stunTimer || e.stunTimer <= 0) {
            const angle = Math.atan2(targetPixelY - e.y, targetPixelX - e.x);
            
            // 計算實際速度（考慮等級加成和降速光環）
            // 等級越高速度越快：等級 1-4 = 線性增長，等級 5 以上速度更快
            // 等級 1: 100%, 等級 4: 115%, 等級 8: 150%+
            const enemyLevel = e.level || 1;
            let levelSpeedMultiplier;
            if (enemyLevel <= 4) {
                // 等級 1-4：每級 +5% (從 4.3% 上調)
                levelSpeedMultiplier = 1 + (enemyLevel - 1) * 0.05;
            } else {
                // 等級 5 以上：更快的增長速度
                const baseSpeed = 1 + (4 - 1) * 0.05; // 等級 4 的基礎速度
                const extraLevels = enemyLevel - 4; // 超過等級 4 的級數
                levelSpeedMultiplier = baseSpeed + extraLevels * 0.08; // 每級額外增加 8% (從 7% 上調)
            }
            let actualSpeed = ENEMY_SPEED * levelSpeedMultiplier;
            
            if (e.inSlowAura && e.slowAuraPercent > 0) {
                // 降速光環效果：速度減少 slowAuraPercent%
                const slowMultiplier = 1 - (e.slowAuraPercent / 100);
                actualSpeed = actualSpeed * slowMultiplier;
            }
            
            e.x += Math.cos(angle) * actualSpeed;
            e.y += Math.sin(angle) * actualSpeed;
        }
        
        if (e.hitTimer > 0) e.hitTimer--;
        if (e.hpTextTimer > 0) e.hpTextTimer--;
        
        // 碰撞檢測 (敵人 vs 蛇)
        // 添加碰撞冷卻時間，避免頻繁觸發（300ms）
        const COLLISION_COOLDOWN = 300;
        const currentTime = performance.now();
        
        // 檢查碰撞冷卻時間
        if (e.lastCollisionTime && currentTime - e.lastCollisionTime < COLLISION_COOLDOWN) {
            return; // 還在冷卻中，跳過這次碰撞檢測
        }
        
        // 標記是否已經處理了碰撞（確保每次只處理一次）
        let collisionHandled = false;
        
        for (let index = 0; index < snake.length && !collisionHandled; index++) {
            const s = snake[index];
            const sx = s.renderX * GRID_SIZE + GRID_SIZE/2;
            const sy = s.renderY * GRID_SIZE + GRID_SIZE/2;
            
            // 根據等級計算體型 (Lv1=1.0, Lv4=1.3)
            const level = s.level || 1;
            const scale = 1 + (level - 1) * 0.1;
            
            // 碰撞距離隨體型變大
            const collisionRadius = GRID_SIZE * 0.8 * scale;
            const dist = Math.hypot(sx - e.x, sy - e.y);
            
            if (dist < collisionRadius) {
                // 碰撞發生
                e.lastCollisionTime = currentTime;
                collisionHandled = true; // 標記已處理，確保只處理一次
                
                if (s.role === "leader") {
                    // 領隊撞到敵人：領隊扣血，敵人也要扣血
                    // 領隊傷害：基礎 0，升級後每級 +5
                    const leaderDamage = getUpgradedValue("leader", "damage", 0);
                    if (leaderDamage > 0) {
                        damageEnemy(e, leaderDamage);
                    }
                    
                    // 檢查無敵狀態
                    const currentTime = performance.now();
                    const isInvincible = invincibilityEndTime > 0 && currentTime < invincibilityEndTime;
                    
                    // 領隊受傷：使用敵人的傷害值（無敵時不扣血）
                    if (!isInvincible) {
                        const enemyDamage = e.damage || 35;
                        leaderHP = Math.max(0, leaderHP - enemyDamage);
                        if (leaderHP <= 0) {
                            triggerGameOver();
                            return;
                        }
                    }
                    
                    // 碰撞回彈：計算從敵人指向玩家的方向（碰撞方向）
                    const dx = sx - e.x;
                    const dy = sy - e.y;
                    const collisionDist = Math.hypot(dx, dy);
                    if (collisionDist > 0) {
                        // 正規化方向向量
                        const nx = dx / collisionDist;
                        const ny = dy / collisionDist;
                        
                        // 回彈力度（像素）- 增加推開距離
                        const bounceForce = 50;
                        
                        // 推開敵人（遠離玩家）
                        e.x -= nx * bounceForce;
                        e.y -= ny * bounceForce;
                        
                        // 添加緩停效果（200ms，約 12 幀 @ 60fps）
                        e.stunTimer = 12;
                        
                        // 為玩家添加視覺回彈偏移（不影響邏輯位置）
                        // 使用回彈速度，在後續幀中逐漸衰減
                        // 減少回彈力度，避免影響移動流暢度
                        if (!s.bounceVx) s.bounceVx = 0;
                        if (!s.bounceVy) s.bounceVy = 0;
                        s.bounceVx = nx * bounceForce / GRID_SIZE * 0.3; // 進一步減少回彈力度（從 0.5 到 0.3）
                        s.bounceVy = ny * bounceForce / GRID_SIZE * 0.3;
                    }
                    
                    // 為領隊添加受傷閃爍效果（深紅色）
                    s.hitTimer = 10; // 閃爍 10 幀
                    
                    // 受傷特效
        effects.push({
                        type: "leader-hit",
                        x: sx,
                        y: sy,
                        radius: GRID_SIZE * 0.5,
                        alpha: 0.5,
                        life: 10
                    });
                } else {
                    // 其他隊員撞到敵人：處理騎士守護邏輯
                    // 尋找第一個騎士（除了被撞的隊員）
                    let knightFound = false;
                    // 使用 findIndex 找到騎士索引，避免索引問題
                    const knightIdx = snake.findIndex((seg, idx) => idx !== index && seg.role === "knight");
                    
                    if (knightIdx !== -1) {
                        knightFound = true;
                        const knightSeg = snake[knightIdx];
                        
                        // 初始化或獲取騎士的 hitPoints
                        if (!knightSeg.hitPoints || knightSeg.hitPoints === undefined) {
                            knightSeg.hitPoints = getKnightHitPoints();
                        }
                        
                        // 為被撞的隊員添加受傷閃爍效果（深紅色）
                        s.hitTimer = 10; // 閃爍 10 幀
                        
                        // 檢查無敵狀態
                        const currentTime = performance.now();
                        const isInvincible = invincibilityEndTime > 0 && currentTime < invincibilityEndTime;
                        
                        // 無敵時不減少 hitPoints，也不觸發爆炸
                        if (!isInvincible) {
                            // 記錄扣血前的 hitPoints，用於判斷是否觸發受傷爆炸
                            const previousHitPoints = knightSeg.hitPoints;
                            
                            // 減少騎士的 hitPoints
                            knightSeg.hitPoints--;
                            
                            // 騎士受傷爆炸（每次扣血時觸發，傷害降低一半）
                            const explosionRange = getKnightExplosionRange();
                            const explosionDamage = getKnightExplosionDamage();
                            
                            if (explosionRange > 0 && explosionDamage > 0 && previousHitPoints > 0) {
                                const knightPixelX = knightSeg.renderX * GRID_SIZE + GRID_SIZE / 2;
                                const knightPixelY = knightSeg.renderY * GRID_SIZE + GRID_SIZE / 2;
                                
                                // 對範圍內的敵人造成傷害
                                enemies.forEach(enemy => {
                                    const dx = enemy.x - knightPixelX;
                                    const dy = enemy.y - knightPixelY;
                                    const dist = Math.sqrt(dx * dx + dy * dy);
                                    
                                    if (dist <= explosionRange) {
                                        damageEnemy(enemy, explosionDamage);
                                    }
                                });
                                
                                // 添加爆炸特效
                                effects.push({
                                    type: "knight-explosion",
                                    x: knightPixelX,
                                    y: knightPixelY,
                                    radius: 0,
                                    maxRadius: explosionRange,
                                    life: 20,
                                    alpha: 0.8,
                                    color: "#f59e0b" // 金色
                                });
                            }
                            
                            // 騎士受傷後觸發無敵效果（1秒內無敵）
                            const invincibilityDuration = getKnightInvincibility();
                            if (invincibilityDuration > 0) {
                                const currentTime = performance.now();
                                invincibilityEndTime = currentTime + (invincibilityDuration * 1000); // 轉換為毫秒
                                // 無敵效果已通過勇者圖片上的閃爍顯示，不需要全屏特效
                            }
                            
                            // 檢查騎士是否死亡（hitPoints <= 0）
                            if (knightSeg.hitPoints <= 0) {
                                snake.splice(knightIdx, 1);
                                scoreValue.textContent = snake.length;
                                
                                // 騎士死亡獎勵：增加隊伍長度
                                const deathBonus = getUpgradedValue("knight", "deathBonus", 0);
                                if (deathBonus > 0) {
                                    const tail = snake[snake.length - 1];
                                    const types = ["archer", "mage", "knight"];
                                    for (let i = 0; i < deathBonus; i++) {
                                        const newRole = types[Math.floor(Math.random() * types.length)];
                                        const newSegment = {
                                            x: tail.x,
                                            y: tail.y,
                                            renderX: tail.x,
                                            renderY: tail.y,
                                            targetRenderX: tail.x,
                                            targetRenderY: tail.y,
                                            role: newRole,
                                            facing: tail.facing,
                                            id: Date.now() + i,
                                            lastShot: 0,
                                            level: 1 // 初始等級為 1
                                        };
                                        // 如果是騎士，初始化 hitPoints
                                        if (newRole === "knight") {
                                            newSegment.hitPoints = getKnightHitPoints(1); // Lv1 的血量
                                        }
                                        snake.push(newSegment);
                                    }
                                    scoreValue.textContent = snake.length;
                                }
                            }
                        }
                    }
                    
                    if (!knightFound) {
                        // 沒有騎士，檢查無敵狀態
                        const currentTime = performance.now();
                        const isInvincible = invincibilityEndTime > 0 && currentTime < invincibilityEndTime;
                        
                        if (!isInvincible) {
                            // 沒有無敵，移除被撞的隊員
                            // 在移除前添加受傷閃爍效果（雖然會立即移除，但視覺上更連貫）
                            s.hitTimer = 3; // 短暫閃爍
                            snake.splice(index, 1);
  scoreValue.textContent = snake.length;
                        }
                    }
                }
            }
        }
    });
    
    // 移除死亡的敵人
    enemies = enemies.filter(e => e.hp > 0 && !e.dead);
}

function getKnightHitPoints(level = 1) {
    // 基礎血量隨勇者等級加倍：Lv1=2, Lv2=4, Lv3=8, Lv4=12 (注意 Lv4 是 12)
    // 注意：可承受攻擊次數升級已被移除，改為充能機制
    if (level === 4) return 12;
    return 2 * Math.pow(2, level - 1);
}

function getKnightExplosionRange() {
    if (!window.UPGRADE_CONFIG) return 0;
    const upgrade = window.UPGRADE_CONFIG.upgrades.knight?.explosion;
    if (!upgrade) return 0;
    const level = upgradeLevels.knight.explosion || 0;
    return upgrade.baseValue + (upgrade.increment * level);
}

function getKnightExplosionDamage() {
    if (!window.UPGRADE_CONFIG) return 0;
    const upgrade = window.UPGRADE_CONFIG.upgrades.knight?.explosion;
    if (!upgrade) return 0;
    const level = upgradeLevels.knight.explosion || 0;
    // 受傷爆炸傷害（配置中已經降低一半，從 10 改為 5）
    return (upgrade.damageIncrement || 0) * level;
}

function getArcherExplosionRange() {
    if (!window.UPGRADE_CONFIG) return 0;
    const upgrade = window.UPGRADE_CONFIG.upgrades.archer?.explosion;
    if (!upgrade) return 0;
    const level = upgradeLevels.archer.explosion || 0;
    return upgrade.baseValue + (upgrade.increment * level);
}

function getArcherExplosionDamage() {
    if (!window.UPGRADE_CONFIG) return 0;
    const upgrade = window.UPGRADE_CONFIG.upgrades.archer?.explosion;
    if (!upgrade) return 0;
    const level = upgradeLevels.archer.explosion || 0;
    return (upgrade.damageIncrement || 0) * level;
}

function getMageScaleBonus() {
    return getUpgradedValue("mage", "scaleBonus", 0);
}

function getMageSlowAura() {
    return getUpgradedValue("mage", "slowAura", 0);
}

function getArcherCritical() {
    return getUpgradedValue("archer", "critical", 0);
}

// 獲取致命攻擊的傷害倍數（每級 +20%）
function getArcherCriticalDamageMultiplier() {
    const level = upgradeLevels.archer.critical || 0;
    // Lv 1: 1.2 倍 (+20%), Lv 2: 1.4 倍 (+40%), ..., Lv 10: 3.0 倍 (+200%)
    return 1 + (level * 0.2);
}

function getKnightInvincibility() {
    return getUpgradedValue("knight", "invincibility", 0);
}

// 獲取當前法師光環的縮放係數（用於傷害範圍和視覺顯示）
function getCurrentMageScale() {
    const scaleBonus = getMageScaleBonus();
    if (scaleBonus === 0) return 1.0;
    
    const currentTime = performance.now();
    const elapsed = currentTime - mageScaleStartTime;
    const cycleDuration = 2000; // 2秒一個循環
    const progress = (elapsed % cycleDuration) / cycleDuration; // 0.0 到 1.0
    
    // 使用 sin 函數創建平滑的縮放效果（從 1.0 → 1+bonus → 1.0）
    const scaleFactor = Math.sin(progress * Math.PI); // 0 到 1 到 0
    const maxScale = 1.0 + (scaleBonus / 100); // 例如 scaleBonus=30 時，maxScale=1.3
    return 1.0 + (maxScale - 1.0) * scaleFactor;
}

function addExp(amount) {
    if (isChoosingUpgrade) return;
    playerExp += amount;
    checkLevelUp();
    updateLevelUI();
}

function checkLevelUp() {
    if (!window.UPGRADE_CONFIG) return;
    const config = window.UPGRADE_CONFIG.leveling;
    const requiredExp = Math.floor(config.baseExp * Math.pow(playerLevelValue, config.expMultiplier));
    
    if (playerExp >= requiredExp) {
        playerExp -= requiredExp;
        playerLevelValue += 1;
        if (playerLevelValue > maxLevelThisRun) {
            maxLevelThisRun = playerLevelValue;
        }
        updateLevelUI();
        showUpgradeSelection();
        checkLevelUp(); // 遞迴檢查是否還能再升級
    }
}

function updateLevelUI() {
    if (!playerLevel || !expText || !expBarFill) return;
    if (!window.UPGRADE_CONFIG) return;
    
    playerLevel.textContent = playerLevelValue;
    const config = window.UPGRADE_CONFIG.leveling;
    const requiredExp = Math.floor(config.baseExp * Math.pow(playerLevelValue, config.expMultiplier));
    expText.textContent = `${playerExp} / ${requiredExp}`;
    const expPercent = Math.min(100, (playerExp / requiredExp) * 100);
    expBarFill.style.width = `${expPercent}%`;
}

function showUpgradeSelection() {
    if (!window.UPGRADE_CONFIG || !upgradeOverlay || !upgradeOptions) return;
    
    // 鎖血
    isChoosingUpgrade = true;
    leaderHP = Math.max(1, leaderHP);
    
    upgradeOverlay.classList.remove("hidden");
    const options = generateUpgradeOptions();
    upgradeOptions.innerHTML = "";
    
    options.forEach((option, index) => {
        const optionElement = createUpgradeOptionElement(option, index);
        upgradeOptions.appendChild(optionElement);
    });
}

function generateUpgradeOptions() {
    if (!window.UPGRADE_CONFIG) return [];
    
    const config = window.UPGRADE_CONFIG.upgrades;
    const abilityTypeLimit = window.UPGRADE_CONFIG.abilityTypeLimit || 10;
    
    // 按職業分組，分別記錄未滿級、滿級、未解鎖的選項
    const byRole = {
        available: {},     // 未滿級且已解鎖的選項
        locked: {},        // 未滿級但未解鎖的選項（能力類型未達上限才能選）
        maxed: {}          // 滿級選項
    };
    
    Object.keys(config).forEach(role => {
        byRole.available[role] = [];
        byRole.locked[role] = [];
        byRole.maxed[role] = [];
        
        Object.keys(config[role]).forEach(upgradeKey => {
            const upgrade = config[role][upgradeKey];
            const currentLevel = upgradeLevels[role][upgradeKey];
            const abilityTypeKey = `${role}.${upgradeKey}`;
            const isUnlocked = unlockedAbilityTypes.has(abilityTypeKey);
            
            const option = {
                role,
                key: upgradeKey,
                upgrade,
                currentLevel,
                abilityTypeKey,
            };
            
            if (currentLevel < upgrade.maxLevel) {
                if (isUnlocked) {
                    // 已解鎖，可以繼續升級
                    byRole.available[role].push(option);
                } else {
                    // 未解鎖，需要檢查能力類型限制
                    byRole.locked[role].push(option);
                }
            } else {
                option.isMaxed = true;
                byRole.maxed[role].push(option);
            }
        });
    });
    
    // 獲取所有職業列表
    const allRoles = Object.keys(config);
    
    // 檢查能力類型是否已達上限
    const canUnlockNewAbility = unlockedAbilityTypes.size < abilityTypeLimit;
    
    // 分離有未滿級選項的職業和只有滿級選項的職業
    const rolesWithAvailable = allRoles.filter(role => byRole.available[role].length > 0);
    const rolesWithLocked = allRoles.filter(role => byRole.locked[role].length > 0);
    const rolesOnlyMaxed = allRoles.filter(role => 
        byRole.available[role].length === 0 && 
        byRole.locked[role].length === 0 && 
        byRole.maxed[role].length > 0
    );
    
    const result = [];
    const usedRoles = new Set();
    
    // 加權隨機選擇函數：從選項列表中根據權重選擇一個
    function weightedRandomSelect(options) {
        if (options.length === 0) return null;
        if (options.length === 1) return options[0];
        
        // 計算總權重
        let totalWeight = 0;
        options.forEach(opt => {
            totalWeight += opt.weight || 1.0;
        });
        
        // 生成 0 到總權重之間的隨機數
        let random = Math.random() * totalWeight;
        
        // 遍歷選項，累加權重，當累加值 >= 隨機數時選中
        let accumulatedWeight = 0;
        for (let i = 0; i < options.length; i++) {
            accumulatedWeight += options[i].weight || 1.0;
            if (accumulatedWeight >= random) {
                return options[i];
            }
        }
        
        // 如果沒選中（理論上不應該發生），返回最後一個
        return options[options.length - 1];
    }
    
    // 從指定職業中選擇一個選項（使用加權隨機）
    function selectFromRole(role) {
        const allOptions = [];
        
        // 收集該職業的所有可用選項，並設定權重
        // 已解鎖未滿級：權重 1.5（提高 50%）
        byRole.available[role].forEach(opt => {
            allOptions.push({ ...opt, weight: 1.5 });
        });
        
        // 未解鎖選項：權重 1.0（如果能力類型未達上限）
        if (canUnlockNewAbility) {
            byRole.locked[role].forEach(opt => {
                allOptions.push({ ...opt, weight: 1.0 });
            });
        }
        
        // 滿級選項：權重 0.5（降低出現機率）
        byRole.maxed[role].forEach(opt => {
            allOptions.push({ ...opt, weight: 0.5 });
        });
        
        if (allOptions.length === 0) return null;
        
        // 使用加權隨機選擇
        return weightedRandomSelect(allOptions);
    }
    
    // 選擇 3 個不同職業的選項
    // 優先從有未滿級選項的職業中選擇，但使用加權隨機確保已解鎖選項有更高機率
    const candidateRoles = [];
    
    // 優先考慮有已解鎖未滿級選項的職業
    rolesWithAvailable.forEach(role => {
        candidateRoles.push({ role, priority: 2 });
    });
    
    // 其次考慮有未解鎖選項的職業（如果能力類型未達上限）
    if (canUnlockNewAbility) {
        rolesWithLocked.forEach(role => {
            if (!candidateRoles.find(c => c.role === role)) {
                candidateRoles.push({ role, priority: 1 });
            }
        });
    }
    
    // 最後考慮只有滿級選項的職業
    rolesOnlyMaxed.forEach(role => {
        if (!candidateRoles.find(c => c.role === role)) {
            candidateRoles.push({ role, priority: 0 });
        }
    });
    
    // 如果候選職業不足 3 個，允許重複職業（但優先不同職業）
    while (result.length < 3 && candidateRoles.length > 0) {
        // 優先從未使用的職業中選擇
        const unusedRoles = candidateRoles.filter(c => !usedRoles.has(c.role));
        const rolesToChooseFrom = unusedRoles.length > 0 ? unusedRoles : candidateRoles;
        
        // 使用加權隨機選擇職業（優先級高的職業更容易被選中）
        const selectedCandidate = weightedRandomSelect(
            rolesToChooseFrom.map(c => ({ ...c, weight: c.priority + 1 }))
        );
        
        if (!selectedCandidate) break;
        
        const selectedRole = selectedCandidate.role;
        const selectedOption = selectFromRole(selectedRole);
        
        if (selectedOption) {
            result.push(selectedOption);
            usedRoles.add(selectedRole);
        } else {
            // 如果該職業沒有選項，從候選列表中移除
            const index = candidateRoles.findIndex(c => c.role === selectedRole);
            if (index > -1) candidateRoles.splice(index, 1);
        }
    }
    
    // 如果仍然不足 3 個，從所有滿級選項中隨機選擇（不限制職業）
    if (result.length < 3) {
        const allMaxedOptions = [];
        Object.keys(byRole.maxed).forEach(role => {
            byRole.maxed[role].forEach(opt => {
                allMaxedOptions.push({ ...opt, weight: 0.5 });
            });
        });
        
        while (result.length < 3 && allMaxedOptions.length > 0) {
            const selected = weightedRandomSelect(allMaxedOptions);
            if (selected) {
                result.push(selected);
                // 從列表中移除已選中的選項
                const index = allMaxedOptions.findIndex(opt => 
                    opt.role === selected.role && opt.key === selected.key
                );
                if (index > -1) allMaxedOptions.splice(index, 1);
            } else {
                break;
            }
        }
    }
    
    // 如果還是沒有選項，返回預設的滿級選項
    if (result.length === 0) {
        return [{
            role: "leader",
            key: "maxHp",
            upgrade: { name: "最大血量", description: "隊長最大血量 +1", icon: "leader.png" },
            currentLevel: -1,
            isMaxed: true,
        }];
    }
    
    return result;
}

function createUpgradeOptionElement(option, index) {
    const div = document.createElement("div");
    div.className = `upgrade-option ${option.isMaxed ? "maxed" : ""}`;
    
    const icon = document.createElement("img");
    icon.className = "upgrade-option-icon";
    icon.src = option.upgrade.icon || "leader.png";
    icon.alt = option.upgrade.name;
    
    const info = document.createElement("div");
    info.className = "upgrade-option-info";
    
    const name = document.createElement("div");
    name.className = "upgrade-option-name";
    name.textContent = option.upgrade.name;
    
    const desc = document.createElement("div");
    desc.className = "upgrade-option-desc";
    
    const level = document.createElement("div");
    level.className = "upgrade-option-level";
    
    if (option.isMaxed) {
        level.textContent = "Lv MAX";
        // 滿級時，描述改為隊長最大血量+1
        desc.textContent = "隊長最大血量 +1";
    } else {
        level.textContent = `Lv ${option.currentLevel} / ${option.upgrade.maxLevel}`;
        
        // 計算當前數值和升級後的數值
        const currentValue = getUpgradedValue(option.role, option.key, option.upgrade.baseValue || 0);
        const nextValue = currentValue + option.upgrade.increment;
        
        // 構建描述文字，顯示升級後的數值（綠色）
        let descText = option.upgrade.description;
        
        // 特殊處理：移動速度顯示提升百分比
        if (option.key === "moveSpeed") {
            // 計算速度提升百分比
            // 速度 = 1 / 間隔，所以提升百分比 = (當前間隔 - 升級後間隔) / 當前間隔 * 100
            const speedIncreasePercent = Math.abs(option.upgrade.increment) / currentValue * 100;
            const percentText = `<span style="color: #4ade80; font-weight: bold;">${speedIncreasePercent.toFixed(1)}%</span>`;
            descText = `隊長移動速度提升 ${percentText}`;
        } else {
            // 替換 {value}：顯示升級後的數值（綠色），包含前面的加減符號
            // 檢查 {value} 前面是否有 + 或 - 符號
            if (descText.includes("+{value}")) {
                const valueReplacement = `<span style="color: #4ade80; font-weight: bold;">+${nextValue}</span>`;
                descText = descText.replace("+{value}", valueReplacement);
            } else if (descText.includes("-{value}")) {
                const valueReplacement = `<span style="color: #4ade80; font-weight: bold;">-${nextValue}</span>`;
                descText = descText.replace("-{value}", valueReplacement);
            } else {
                const valueReplacement = `<span style="color: #4ade80; font-weight: bold;">${nextValue}</span>`;
                descText = descText.replace("{value}", valueReplacement);
            }
            
            // 如果有 damageIncrement，也替換 {damage}（包含前面的加減符號）
            if (option.upgrade.damageIncrement !== undefined) {
                // damageIncrement 是每次升級增加的傷害值
                // 當前傷害 = 當前等級 * damageIncrement
                // 升級後傷害 = (當前等級 + 1) * damageIncrement
                const currentLevel = option.currentLevel || 0;
                const nextDamage = (currentLevel + 1) * option.upgrade.damageIncrement;
                
                if (descText.includes("+{damage}")) {
                    const damageReplacement = `<span style="color: #4ade80; font-weight: bold;">+${nextDamage}</span>`;
                    descText = descText.replace("+{damage}", damageReplacement);
                } else if (descText.includes("-{damage}")) {
                    const damageReplacement = `<span style="color: #4ade80; font-weight: bold;">-${nextDamage}</span>`;
                    descText = descText.replace("-{damage}", damageReplacement);
                } else {
                    const damageReplacement = `<span style="color: #4ade80; font-weight: bold;">${nextDamage}</span>`;
                    descText = descText.replace("{damage}", damageReplacement);
                }
            }
        }
        
        desc.innerHTML = descText;
    }
    
    info.appendChild(name);
    info.appendChild(desc);
    info.appendChild(level);
    
    div.appendChild(icon);
    div.appendChild(info);
    
    if (!option.isMaxed) {
        div.addEventListener("click", () => selectUpgrade(option));
    }
    
    return div;
}

function selectUpgrade(option) {
    if (!window.UPGRADE_CONFIG) return;
    
    // 如果是滿級選項，固定增加隊長最大血量（不算入能力類型）
    if (option.isMaxed) {
        const config = window.UPGRADE_CONFIG.maxedOutBonus || { hpIncrease: 1 };
        const hpIncrease = config.hpIncrease || 1;
        
        // 增加隊長最大血量
        upgradeLevels.leader.maxHp += hpIncrease;
        const newMaxHp = getLeaderMaxHp();
        leaderHP = Math.min(newMaxHp, leaderHP + 5); // 增加當前血量
    } else {
        // 檢查是否是新解鎖的能力類型
        const abilityTypeKey = option.abilityTypeKey || `${option.role}.${option.key}`;
        const isNewAbility = !unlockedAbilityTypes.has(abilityTypeKey);
        
        // 正常升級
        upgradeLevels[option.role][option.key] += 1;
        
        // 如果是新能力，加入已解鎖列表
        if (isNewAbility) {
            unlockedAbilityTypes.add(abilityTypeKey);
            updateAbilityTypeUI(); // 更新 UI 顯示
        }
        
        // 如果是隊長血量升級，立即更新當前血量上限
        if (option.role === "leader" && option.key === "maxHp") {
            const newMaxHp = getLeaderMaxHp();
            leaderHP = Math.min(newMaxHp, leaderHP + 5); // 增加當前血量
        }
        
        // 如果是騎士可受攻擊次數升級，增加場上所有騎士的 hitPoints
        if (option.role === "knight" && option.key === "hitPoints") {
            const upgrade = window.UPGRADE_CONFIG.upgrades.knight.hitPoints;
            const increment = upgrade.increment || 1; // 升級增量（通常是 1）
            const newMaxHitPoints = getKnightHitPoints(); // 新的最大 hitPoints
            
            // 遍歷場上所有騎士，增加 hitPoints
            snake.forEach(segment => {
                if (segment.role === "knight" && segment.hitPoints !== undefined) {
                    // 增加 hitPoints（增加增量）
                    segment.hitPoints += increment;
                    // 但不超過新的最大值
                    segment.hitPoints = Math.min(segment.hitPoints, newMaxHitPoints);
                }
            });
        }
    }
    
    upgradeOverlay.classList.add("hidden");
    isChoosingUpgrade = false;
}

// 更新能力類型 UI 顯示
function updateAbilityTypeUI() {
    const abilityTypeText = document.getElementById("abilityTypeText");
    if (abilityTypeText) {
        const limit = window.UPGRADE_CONFIG?.abilityTypeLimit || 10;
        abilityTypeText.textContent = `能力類型: ${unlockedAbilityTypes.size}/${limit}`;
    }
}

// ========== 弓箭手攻擊系統 ==========
let lastArcherShot = 0;

function handleArcherAttacks(timestamp) {
    if (!window.UPGRADE_CONFIG) return;
    
    snake.forEach((segment, index) => {
        if (index === 0) return; // 跳過隊長
        if (segment.role !== "archer") return;
        
        // 檢查冷卻時間
        const cooldown = getArcherCooldown();
        if (timestamp - (segment.lastShot || 0) < cooldown) return;
        
        // 尋找最近敵人
        const segCenter = {
            x: segment.renderX * GRID_SIZE + GRID_SIZE / 2,
            y: segment.renderY * GRID_SIZE + GRID_SIZE / 2
        };
        
        let nearestEnemy = null;
        let minDist = Infinity;
        
        enemies.forEach(e => {
            if (e.hp <= 0 || e.dead) return;
            const dist = Math.hypot(segCenter.x - e.x, segCenter.y - e.y);
            // 只攻擊範圍內的敵人
            if (dist <= ATTACK_RANGE && dist < minDist) {
                minDist = dist;
                nearestEnemy = e;
            }
        });
        
        if (!nearestEnemy) return;
        
        // 發射箭矢
        const angle = Math.atan2(nearestEnemy.y - segCenter.y, nearestEnemy.x - segCenter.x);
        const arrowCount = getArcherArrowCount();
        const arrowSpeed = getArcherArrowSpeed();
        const criticalChance = getArcherCritical(); // 必殺機率
        
        for (let i = 0; i < arrowCount; i++) {
            const spreadAngle = arrowCount > 1 ? (i - (arrowCount - 1) / 2) * 0.2 : 0;
            const offsetDistance = GRID_SIZE * 0.6;
            
            // 判斷是否觸發必殺
            const isCritical = criticalChance > 0 && Math.random() * 100 < criticalChance;
            
            // 根據勇者等級計算基礎傷害
            // Lv1: 5, Lv2: 10, Lv3: 15, Lv4: 20
            const level = segment.level || 1;
            const baseDamage = 5 * level;
            
            // 致命攻擊傷害：每級 +20% (Lv1: 1.2倍, Lv2: 1.4倍, ..., Lv10: 3.0倍)
            const actualDamage = isCritical ? baseDamage * getArcherCriticalDamageMultiplier() : baseDamage;
            
            // 計算起始位置
            const startX = segCenter.x + Math.cos(angle + spreadAngle) * offsetDistance;
            const startY = segCenter.y + Math.sin(angle + spreadAngle) * offsetDistance;
            
            projectiles.push({
                x: startX,
                y: startY,
                startX: startX, // 記錄起始位置
                startY: startY, // 記錄起始位置
                vx: Math.cos(angle + spreadAngle) * arrowSpeed,
                vy: Math.sin(angle + spreadAngle) * arrowSpeed,
                damage: actualDamage,
                isCritical: isCritical, // 標記是否為致命一擊
                shooterIndex: index,
                framesAlive: 0,
                maxDistance: ATTACK_RANGE // 最大射擊距離等於瞄準距離
            });
        }
        
        segment.lastShot = timestamp;
    });
}

function getArcherArrowCount() {
    return getUpgradedValue("archer", "arrowCount", 1);
}

function getArcherArrowSpeed() {
    return getUpgradedValue("archer", "arrowSpeed", PROJECTILE_SPEED);
}

function getArcherCooldown() {
    if (!window.UPGRADE_CONFIG) return 1000;
    const config = window.UPGRADE_CONFIG.upgrades?.archer?.arrowSpeed;
    if (!config) return 1000;
    const currentLevel = upgradeLevels.archer.arrowSpeed || 0;
    const reduction = Math.min(currentLevel * 0.1, 0.5);
    const newCooldown = 1000 * (1 - reduction);
    return Math.max(newCooldown, 500);
}

function updateProjectiles() {
    const projectilesToRemove = new Set();
    
    projectiles.forEach((proj, projIndex) => {
        // 如果這個投射物已經被標記為移除，跳過
        if (projectilesToRemove.has(projIndex)) return;
        
        proj.x += proj.vx;
        proj.y += proj.vy;
        if (proj.framesAlive !== undefined) {
            proj.framesAlive++;
            if (proj.framesAlive > 3) {
                delete proj.shooterIndex;
            }
        }
        
        // 檢查是否超過最大射擊距離
        if (proj.maxDistance !== undefined && proj.startX !== undefined && proj.startY !== undefined) {
            const distanceTraveled = Math.hypot(proj.x - proj.startX, proj.y - proj.startY);
            if (distanceTraveled > proj.maxDistance) {
                projectilesToRemove.add(projIndex);
                return;
            }
        }
        
        // 檢查邊界
        if (proj.x < 0 || proj.y < 0 || proj.x > WORLD_WIDTH_PX || proj.y > WORLD_HEIGHT_PX) {
            projectilesToRemove.add(projIndex);
            return;
        }
        
        // 檢查與隊伍成員碰撞（跳過發射者前幾幀）
        for (let i = 0; i < snake.length; i++) {
            if (proj.shooterIndex === i && proj.framesAlive !== undefined && proj.framesAlive <= 3) {
                continue;
            }
    const segment = snake[i];
            const segCenter = {
                x: segment.renderX * GRID_SIZE + GRID_SIZE / 2,
                y: segment.renderY * GRID_SIZE + GRID_SIZE / 2
            };
            const dist = Math.hypot(proj.x - segCenter.x, proj.y - segCenter.y);
            if (dist < GRID_SIZE * 0.4) {
                projectilesToRemove.add(projIndex);
                return;
            }
        }
        
        // 檢查與敵人碰撞（一支箭只能擊中一個敵人）
        for (const enemy of enemies) {
            if (enemy.hp <= 0 || enemy.dead) continue;
            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (dist < GRID_SIZE * 0.4) {
                // 擊中敵人，造成傷害並移除弓箭
                damageEnemy(enemy, proj.damage, proj.isCritical);
                
                // 弓箭爆炸效果
                const explosionRange = getArcherExplosionRange();
                const explosionDamage = getArcherExplosionDamage();
                
                if (explosionRange > 0 && explosionDamage > 0) {
                    // 對範圍內的所有敵人造成爆炸傷害（包括被擊中的敵人，這是額外的第二次傷害）
                    enemies.forEach(otherEnemy => {
                        if (otherEnemy.hp > 0 && !otherEnemy.dead) {
                            const dx = otherEnemy.x - proj.x;
                            const dy = otherEnemy.y - proj.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance <= explosionRange) {
                                // 對範圍內的所有敵人造成爆炸傷害（包括被弓箭直接擊中的敵人）
                                damageEnemy(otherEnemy, explosionDamage);
                            }
                        }
                    });
                    
                    // 添加爆炸特效
                    effects.push({
                        type: "arrow-explosion",
                        x: proj.x,
                        y: proj.y,
                        radius: 0,
                        maxRadius: explosionRange,
                        life: 15,
                        alpha: 0.7,
                        color: "#22c55e" // 綠色
                    });
                }
                
                projectilesToRemove.add(projIndex);
                break; // 一支箭只能擊中一個敵人，擊中後立即停止檢查
            }
        }
    });
    
    // 移除被標記的投射物（從後往前移除，避免索引錯亂）
    const indicesToRemove = Array.from(projectilesToRemove).sort((a, b) => b - a);
    indicesToRemove.forEach(index => {
        projectiles.splice(index, 1);
    });
}

// ========== 法師光環系統 ==========
const AURA_HIT_INTERVAL = 200; // 法師光環傷害間隔（毫秒），降低傷害頻率

function handleMageAura(timestamp) {
    if (!window.UPGRADE_CONFIG) return;
    
    // 獲取當前的光環縮放係數（只計算一次，避免重複計算）
    const currentScale = getCurrentMageScale();
    const slowAura = getMageSlowAura(); // 獲取降速光環效果
    
    snake.forEach((segment, index) => {
        if (index === 0) return; // 跳過隊長
        if (segment.role !== "mage") return;
        
        const mageCenter = {
            x: segment.renderX * GRID_SIZE + GRID_SIZE / 2,
            y: segment.renderY * GRID_SIZE + GRID_SIZE / 2
        };
        
        const baseAuraRadius = getMageAuraRadius();
        const auraDamage = getMageAuraDamage();
        
        // 應用縮放到實際傷害範圍（與視覺一致）
        const scaledAuraRadius = baseAuraRadius * currentScale;
        
        let hasEnemyInRange = false;
        
        // 對範圍內敵人造成傷害
        // 視覺上光環的線條寬度會讓圓圈看起來更大
        // 線條寬度為 2-4px（根據是否有敵人），會向外延伸 lineWidth/2
        // 光環的視覺外邊緣距離法師中心 = scaledAuraRadius + lineWidth/2
        // 怪物也有大小（GRID_SIZE），怪物邊緣距離怪物中心 = GRID_SIZE/2
        // 當光環邊緣和怪物邊緣接觸時：
        //   怪物中心距離 - GRID_SIZE/2 = scaledAuraRadius + lineWidth/2
        //   怪物中心距離 = scaledAuraRadius + lineWidth/2 + GRID_SIZE/2
        // 使用最大線條寬度（4px）來計算，確保傷害範圍不會小於視覺範圍
        const maxLineWidth = 4; // 有敵人時的線條寬度
        const enemyRadius = GRID_SIZE / 2; // 怪物半徑
        const effectiveRadius = scaledAuraRadius + maxLineWidth / 2 + enemyRadius; // 有效傷害範圍（考慮縮放、光環線條和怪物大小）
        
        enemies.forEach(e => {
            if (e.hp <= 0 || e.dead) return;
            // 敵人使用像素座標（中心點），法師中心也是像素座標
            // 計算敵人中心到法師中心的距離
            const centerDist = Math.hypot(mageCenter.x - e.x, mageCenter.y - e.y);
            // 使用有效半徑來匹配視覺效果（當怪物邊緣接觸光環邊緣時就能造成傷害）
            if (centerDist <= effectiveRadius) {
                hasEnemyInRange = true;
                
                // 檢查傷害間隔，避免傷害頻率過高
                if (!e.lastAuraHit || timestamp - e.lastAuraHit >= AURA_HIT_INTERVAL) {
                    damageEnemy(e, auraDamage);
                    e.lastAuraHit = timestamp;
                }
                
                // 降速光環效果：標記敵人在光環內
                if (slowAura > 0) {
                    e.inSlowAura = true;
                    e.slowAuraPercent = slowAura; // 存儲降速百分比
                }
            } else {
                // 不在光環範圍內，移除降速標記
                if (e.inSlowAura) {
                    e.inSlowAura = false;
                    e.slowAuraPercent = 0;
                }
            }
        });
        
        // 將光環資訊存儲在 segment 上，用於繪製（不通過 effects 陣列，避免效能問題）
        segment.auraInfo = {
            x: mageCenter.x,
            y: mageCenter.y,
            radius: baseAuraRadius, // 存儲基礎半徑，繪製時再應用縮放
            hasEnemy: hasEnemyInRange
        };
    });
}

function getMageAuraRadius() {
    return getUpgradedValue("mage", "auraRange", AURA_RADIUS);
}

function getMageAuraDamage(level = 1) {
    // 基礎傷害隨勇者等級加倍：Lv1=3, Lv2=6, Lv3=12, Lv4=24
    const baseDamage = 3 * Math.pow(2, level - 1);
    return getUpgradedValue("mage", "auraDamage", baseDamage);
}

// ========== 敵人傷害系統 ==========
function damageEnemy(enemy, amount, isCritical = false) {
    if (!enemy || enemy.hp <= 0) return;
    
    const oldHp = enemy.hp;
  enemy.hp -= amount;
    enemy.hitTimer = 10; // 受傷閃爍時間
    enemy.hpTextTimer = 60; // HP 文字顯示時間
    
    // 添加傷害數字特效
    if (amount > 0) {
  effects.push({
            type: "text",
            text: isCritical ? `致命 -${Math.ceil(amount)}` : `-${Math.ceil(amount)}`,
    x: enemy.x,
    y: enemy.y,
            life: 30,
            color: isCritical ? "#fbbf24" : "#ef4444", // 致命一擊顯示金色
            isCritical: isCritical // 標記為致命一擊（用於特效）
        });
        
        // 如果是致命一擊，添加額外的視覺特效
        if (isCritical) {
    effects.push({
                type: "critical-flash",
      x: enemy.x,
      y: enemy.y,
                radius: 0,
                maxRadius: GRID_SIZE * 1.2,
                life: 10,
                alpha: 0.8,
                color: "#fbbf24" // 金色
            });
        }
    }
    
    // 擊殺敵人
    if (enemy.hp <= 0) {
        enemy.dead = true;
        enemy.hp = 0;
        
        // 獲得經驗值
        const enemyLevel = enemy.level || 1;
        const config = window.UPGRADE_CONFIG?.enemyLevel || { baseExp: 10 };
        const exp = config.baseExp * enemyLevel;
        addExp(exp);
        
        // 隊長回血
        leaderHP = Math.min(getLeaderMaxHp(), leaderHP + 10);
        
        // 擊殺數增加
        killCount++;
        if (killValue) killValue.textContent = killCount;
        
        // 騎士擊殺充能邏輯
        knightKillCounter++;
        const rechargeLevel = upgradeLevels.knight.recharge || 0;
        if (knightKillCounter >= 10) {
            knightKillCounter = 0;
            
            if (rechargeLevel > 0) {
                const healAmount = rechargeLevel; // Lv1 回 1, Lv5 回 5
                let healed = false;
                
                // 為所有受傷的騎士回血
                snake.forEach(seg => {
                    if (seg.role === "knight" && seg.hitPoints !== undefined) {
                        const maxHp = getKnightHitPoints(seg.level || 1);
                        if (seg.hitPoints < maxHp) {
                            seg.hitPoints = Math.min(maxHp, seg.hitPoints + healAmount);
                            healed = true;
                            
                            // 單個騎士回血特效
  effects.push({
                                type: "text",
                                text: `+${healAmount} HP`,
                                x: seg.renderX * GRID_SIZE,
                                y: seg.renderY * GRID_SIZE - 20,
                                color: "#4ade80", // 綠色
                                life: 40,
                                vy: -0.5,
                                fontSize: 14
                            });
                        }
                    }
                });
                
                if (healed) {
                    // 如果有騎士被治療，播放一個充能音效或特效（這裡先用文字）
                    // 可以在畫面上方顯示 "聖光充能!"
                }
            }
        }
        
        // 擊殺特效
  effects.push({
    type: "kill",
            x: enemy.x,
            y: enemy.y,
    radius: GRID_SIZE * 0.4,
    alpha: 0.6,
            life: 30
        });
    }
}

// ========== 渲染系統 (Render System) ==========

function draw() {
  // 1. 清除畫面
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  // 應用全局縮放 (手機版拉遠視野)
  ctx.scale(GAME_SCALE, GAME_SCALE);
  
  // 2. 繪製網格背景 (世界座標 -> 螢幕座標)
  // 優化：只繪製 Camera 視野內的網格
  const startCol = Math.floor(camera.x / GRID_SIZE);
  const endCol = startCol + Math.ceil(camera.width / GRID_SIZE) + 1;
  const startRow = Math.floor(camera.y / GRID_SIZE);
  const endRow = startRow + Math.ceil(camera.height / GRID_SIZE) + 1;
  
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1; // 縮放後線條會變細，如果需要保持粗細可以除以 GAME_SCALE
  ctx.beginPath();
  
  for (let c = startCol; c <= endCol; c++) {
      const x = c * GRID_SIZE - camera.x;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, camera.height);
  }
  for (let r = startRow; r <= endRow; r++) {
      const y = r * GRID_SIZE - camera.y;
      ctx.moveTo(0, y);
      ctx.lineTo(camera.width, y);
  }
  ctx.stroke();
  
  // 3. 繪製世界邊界 (World Bounds)
  const boundRect = camera.transform(0, 0);
  ctx.strokeStyle = "#ef4444"; // 危險紅
  ctx.lineWidth = 4;
  ctx.strokeRect(boundRect.x, boundRect.y, WORLD_WIDTH_PX, WORLD_HEIGHT_PX);
  
  // 4. 繪製道具（繪製所有道具）
  items.forEach(item => {
  if (item) {
          const pos = camera.transform(item.x * GRID_SIZE, item.y * GRID_SIZE);
          // 檢查是否在畫面內 (Culling) - 使用 camera.width/height 確保縮放後邊界判斷正確
          if (pos.x > -GRID_SIZE && pos.x < camera.width && pos.y > -GRID_SIZE && pos.y < camera.height) {
              ASSETS.item.draw(ctx, pos.x, pos.y, GRID_SIZE);
              
              // 繪製職業文字 (弓/法/騎)
              if (item.role) {
                  ctx.save();
                  ctx.fillStyle = "#ffffff";
                  ctx.font = "bold 12px sans-serif";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.shadowColor = "rgba(0,0,0,0.8)";
                  ctx.shadowBlur = 2;
                  ctx.shadowOffsetX = 1;
                  ctx.shadowOffsetY = 1;
                  
                  let roleText = "";
                  if (item.role === "archer") roleText = "弓";
                  else if (item.role === "mage") roleText = "法";
                  else if (item.role === "knight") roleText = "騎";
                  
                  if (roleText) {
                      ctx.fillText(roleText, pos.x + GRID_SIZE/2, pos.y + GRID_SIZE - 5);
                  }
                  ctx.restore();
              }
          }
      }
  });
  
  // 5. 繪製敵人
  enemies.forEach(e => {
      const pos = camera.transform(e.x - GRID_SIZE/2, e.y - GRID_SIZE/2);
      // 檢查是否在畫面內 (Culling) - 使用 camera.width/height 確保縮放後邊界判斷正確
      if (pos.x > -GRID_SIZE && pos.x < camera.width && pos.y > -GRID_SIZE && pos.y < camera.height) {
          ctx.save();
          
          // 根據怪物等級使用對應的圖片（mob_1.png ~ mob_8.png）
          const enemyLevel = e.level || 1;
          const clampedLevel = Math.max(1, Math.min(8, enemyLevel)); // 限制在 1-8 範圍
          const mobAssetKey = `mob_${clampedLevel}`;
          if (ASSETS[mobAssetKey]) {
              ASSETS[mobAssetKey].draw(ctx, pos.x, pos.y, GRID_SIZE);
    } else {
              // 如果圖片未載入，使用 fallback
              ctx.fillStyle = "#efefef";
              ctx.fillRect(pos.x, pos.y, GRID_SIZE, GRID_SIZE);
              ctx.fillStyle = "#fff";
              ctx.font = `${GRID_SIZE/2}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("💀", pos.x + GRID_SIZE/2, pos.y + GRID_SIZE/2);
          }
          
          // 受傷特效：深紫色閃爍（繪製在圖片上方）
          if (e.hitTimer > 0) {
              ctx.globalCompositeOperation = "multiply"; // 使用混合模式讓效果更明顯
              ctx.globalAlpha = 0.7;
              ctx.fillStyle = "#6b21a8"; // 深紫色
              ctx.fillRect(pos.x, pos.y, GRID_SIZE, GRID_SIZE);
              ctx.globalAlpha = 1;
              ctx.globalCompositeOperation = "source-over"; // 恢復正常混合模式
          }
          
          // 血條
          if (e.hp < e.maxHp) {
              drawHealthBar(ctx, pos.x, pos.y - 10, GRID_SIZE, 4, e.hp, e.maxHp);
          }
          
          // 顯示傷害數字（當 hpTextTimer > 0 時）
          if (e.hpTextTimer > 0 && e.hp < e.maxHp) {
              ctx.fillStyle = "#ef4444";
              ctx.font = "bold 12px sans-serif";
              ctx.textAlign = "center";
              const hpText = `HP${Math.ceil(e.hp)}`;
              ctx.fillText(hpText, pos.x + GRID_SIZE/2, pos.y - 15);
              ctx.textAlign = "left";
          }
          
          // 等級
          ctx.fillStyle = "white";
          ctx.font = "10px sans-serif";
          ctx.fillText(`Lv.${e.level}`, pos.x + GRID_SIZE/2, pos.y + GRID_SIZE + 10);
          
          ctx.restore();
      }
  });
  
  // 6. 繪製蛇 (從後往前繪製，確保頭在最上面)
  // 無敵狀態檢查（在循環外只計算一次，提升效能）
  const currentTime = performance.now();
  const isInvincible = invincibilityEndTime > 0 && currentTime < invincibilityEndTime;
  let invincibilityFlashAlpha = 0;
  if (isInvincible) {
      // 降低閃爍頻率（每秒 2 次，更舒適）
      const flashSpeed = 2;
      const flashPhase = (currentTime / 1000) * flashSpeed * Math.PI * 2;
      // 使用 sin 函數，讓閃爍更平滑
      invincibilityFlashAlpha = (Math.sin(flashPhase) + 1) / 2; // 0 到 1
  }
  
  for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const pos = camera.transform(s.renderX * GRID_SIZE, s.renderY * GRID_SIZE);
      const assetKey = s.role;
      
      if (ASSETS[assetKey]) {
          // 如果是騎士，根據剩餘 hitPoints 百分比設置透明度
          let knightAlpha = 1.0;
          if (s.role === "knight") {
              // 確保 hitPoints 已初始化
              if (s.hitPoints === undefined || s.hitPoints === null) {
                  s.hitPoints = getKnightHitPoints();
              }
              
              // 計算剩餘百分比：hitPoints / maxHitPoints
              const maxHitPoints = getKnightHitPoints(s.level || 1);
              if (s.hitPoints <= 0) {
                  // 如果 hitPoints 已歸零，非常透明（接近死亡）
                  knightAlpha = 0.3;
    } else {
                  // 計算剩餘百分比
                  const hitPointsPercent = s.hitPoints / maxHitPoints;
                  // 透明度：100% 時完全不透明，0% 時 30% 透明（70% 可見）
                  // 公式：alpha = 0.3 + (hitPointsPercent * 0.7)
                  knightAlpha = 0.3 + (hitPointsPercent * 0.7);
                  // 確保透明度在合理範圍內
                  knightAlpha = Math.max(0.3, Math.min(1.0, knightAlpha));
              }
          }
          
          ctx.save();
          ctx.globalAlpha = knightAlpha;
          
          // 根據等級縮放角色大小 (Lv1=1.0, Lv2=1.1, Lv3=1.2, Lv4=1.3)
          const level = s.level || 1;
          const scale = 1 + (level - 1) * 0.1;
          
          // 繪製時應用縮放（以中心點為基準）
          const drawSize = GRID_SIZE * scale;
          const drawX = pos.x - (drawSize - GRID_SIZE) / 2;
          const drawY = pos.y - (drawSize - GRID_SIZE) / 2;
          
          ASSETS[assetKey].draw(ctx, drawX, drawY, drawSize, s.facing);
          ctx.restore();
          
          // 升級特效 (角色變白 + 升級白光)
          if (s.levelUpTimer && s.levelUpTimer > 0) {
              const progress = s.levelUpTimer / 40; // 1 -> 0 (40 幀)
              
              // 1. 角色變白閃爍 (使用 lighter 混合模式覆蓋一個白色圓形/矩形)
              ctx.save();
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = progress * 0.8;
              ctx.fillStyle = "#ffffff";
              // 覆蓋在角色位置
              ctx.fillRect(drawX, drawY, drawSize, drawSize);
              ctx.restore();
              
              // 2. 往上升級白光 (向上移動的光柱/粒子)
              ctx.save();
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = progress * 0.6;
              const beamWidth = drawSize * 0.8;
              const beamHeight = GRID_SIZE * 2 * progress; // 隨時間變短或變長？通常是向上升起
              // 讓光柱從下往上長，或者整體向上飄
              const beamY = pos.y + drawSize/2 - beamHeight;
              
              // 創建漸層光柱
              const gradient = ctx.createLinearGradient(0, beamY, 0, beamY + beamHeight);
              gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
              gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
              gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
              
              ctx.fillStyle = gradient;
              ctx.fillRect(pos.x + (GRID_SIZE - beamWidth)/2, beamY, beamWidth, beamHeight);
              ctx.restore();
              
              s.levelUpTimer--;
          }
          
          // 顯示等級 (Lv 2, Lv 3, Lv MAX)
          if (s.role !== "leader") {
            const level = s.level || 1;
            if (level > 1) {
                ctx.save();
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 10px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.shadowColor = "rgba(0,0,0,0.8)";
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                
                const text = level >= 4 ? "Lv MAX" : `Lv ${level}`;
                // 如果是 Lv MAX，用金色顯示
                if (level >= 4) ctx.fillStyle = "#FFD700";
                
                ctx.fillText(text, pos.x + GRID_SIZE/2, pos.y + GRID_SIZE - 12);
                ctx.restore();
            }
          }
          
          // 無敵閃爍效果（全隊同步淺黃色閃爍，更明顯）
          if (isInvincible && invincibilityFlashAlpha > 0.1) {
              ctx.save();
              // 使用 lighter 混合模式，讓淺色更亮更明顯，對比度更大
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = invincibilityFlashAlpha * 0.9; // 高亮度
              // 使用更亮的淺黃色，對比度更大
              ctx.fillStyle = "#fffbeb"; // 非常淺的黃色（接近白色，但帶黃色調）
              ctx.fillRect(pos.x, pos.y, GRID_SIZE, GRID_SIZE);
              ctx.globalCompositeOperation = "source-over";
              ctx.globalAlpha = 1;
              ctx.restore();
          }
          
          // 如果正在受傷閃爍，用深紅色覆蓋（hitTimer 已在邏輯更新階段更新）
          if (s.hitTimer !== undefined && s.hitTimer > 0) {
              ctx.save();
              ctx.globalAlpha = 0.6; // 半透明深紅色覆蓋
              ctx.fillStyle = "#8b0000"; // 深紅色
              ctx.fillRect(pos.x, pos.y, GRID_SIZE, GRID_SIZE);
              ctx.globalAlpha = 1;
              ctx.restore();
          }
          
          // 繪製法師光環（直接繪製，不通過 effects 陣列，提升效能）
          if (s.role === "mage" && s.auraInfo) {
              const auraPos = camera.transform(s.auraInfo.x, s.auraInfo.y);
              // 檢查是否在畫面內（加上光環半徑的緩衝）
              const baseAuraRadius = s.auraInfo.radius;
              
              // 獲取當前縮放係數（與傷害範圍一致）
              const visualAuraScale = getCurrentMageScale();
              const auraRadius = baseAuraRadius * visualAuraScale; // 應用縮放
              
              if (auraPos.x > -auraRadius && auraPos.x < canvas.width + auraRadius && 
                  auraPos.y > -auraRadius && auraPos.y < canvas.height + auraRadius) {
      ctx.save();
                  const isActive = s.auraInfo.hasEnemy;
                  ctx.globalAlpha = isActive ? 0.6 : 0.2; // 有敵人時更亮
                  ctx.strokeStyle = isActive ? "#93c5fd" : "#60a5fa"; // 有敵人時更亮的藍色
                  ctx.lineWidth = isActive ? 4 : 2; // 有敵人時線條更粗
      ctx.beginPath();
                  ctx.arc(auraPos.x, auraPos.y, auraRadius, 0, Math.PI * 2);
                  ctx.stroke();
      ctx.restore();
    }
          }
      }
      
      // 隊長血條（只有血量未滿時才顯示）
      if (i === 0 && leaderHP < getLeaderMaxHp()) {
          drawHealthBar(ctx, pos.x, pos.y - 10, GRID_SIZE, 5, leaderHP, getLeaderMaxHp());
          
          // 無敵狀態倒數顯示（使用循環外計算的 currentTime 和 isInvincible）
          if (isInvincible) {
              const remainingTime = Math.ceil((invincibilityEndTime - currentTime) / 1000);
              if (remainingTime > 0) {
                  ctx.save();
                  ctx.fillStyle = "#fbbf24"; // 金色
                  ctx.strokeStyle = "#854d0e";
                  ctx.lineWidth = 3;
                  ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  // 繪製文字陰影效果，讓文字更明顯
                  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
                  ctx.shadowBlur = 4;
                  ctx.shadowOffsetX = 2;
                  ctx.shadowOffsetY = 2;
                  ctx.strokeText(`無敵 ${remainingTime}s`, pos.x + GRID_SIZE / 2, pos.y - 25);
                  ctx.fillText(`無敵 ${remainingTime}s`, pos.x + GRID_SIZE / 2, pos.y - 25);
                  ctx.shadowBlur = 0;
                  ctx.shadowOffsetX = 0;
                  ctx.shadowOffsetY = 0;
                  ctx.textAlign = "left";
                  ctx.textBaseline = "alphabetic";
                  ctx.restore();
              }
          }
      }
  }
  
  // 7. 繪製投射物（弓箭）
  projectiles.forEach((proj) => {
      const pos = camera.transform(proj.x, proj.y);
      // 檢查是否在畫面內
      if (pos.x > -GRID_SIZE && pos.x < canvas.width && pos.y > -GRID_SIZE && pos.y < canvas.height) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - proj.vx * 2, pos.y - proj.vy * 2);
    ctx.stroke();
      }
  });

  // 8. 繪製特效
  effects.forEach(e => {
      const pos = camera.transform(e.x, e.y);
    ctx.save();
      
      if (e.type === "text") {
          ctx.fillStyle = e.color;
          // 支援自定義 fontSize 與 fontWeight
          const fontSize = e.fontSize || (e.isCritical ? 20 : 14);
          const fontWeight = e.fontWeight || "bold";
          ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
          ctx.fillText(e.text, pos.x, pos.y - (30 - e.life)); // 向上飄
          e.life--;
      } else if (e.type === "critical-flash") {
          // 致命一擊閃光特效（快速擴散）
          const progress = 1 - (e.life / 10); // 0 到 1
          e.radius = e.maxRadius * progress;
          ctx.globalAlpha = e.alpha * (1 - progress); // 逐漸淡出
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 3;
      ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
          e.life--;
      } else if (e.type === "aura") {
          // 法師光環特效（已移除，改為直接繪製）
          // 這個分支現在不會被執行，但保留以防萬一
          e.life--;
      } else if (e.type === "kill") {
          // 擊殺特效
          ctx.globalAlpha = e.alpha;
          ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
          e.alpha -= 0.02;
          e.life--;
      } else if (e.type === "leader-hit") {
          // 領隊受傷特效
          ctx.globalAlpha = e.alpha;
          ctx.fillStyle = "rgba(248, 113, 113, 0.5)";
      ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
          e.alpha -= 0.05;
          e.life--;
      } else if (e.type === "merge-flash") {
          // 合成特效 (白色圓圈擴散)
          const progress = 1 - (e.life / 20);
          ctx.globalAlpha = 1 - progress;
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius * progress * 2, 0, Math.PI * 2);
          ctx.fill();
          e.life--;
      } else if (e.type === "item-collect") {
          // 道具收集光環擴散特效
          const progress = 1 - (e.life / 20); // 0 到 1
          e.radius = e.maxRadius * progress;
          ctx.globalAlpha = e.alpha * (1 - progress); // 逐漸淡出
          ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
          e.life--;
      } else if (e.type === "knight-explosion") {
          // 騎士受傷爆炸特效
          const progress = 1 - (e.life / 20); // 0 到 1
          e.radius = e.maxRadius * progress;
          ctx.globalAlpha = e.alpha * (1 - progress); // 逐漸淡出
          ctx.fillStyle = e.color;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 3;
      ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
          ctx.globalAlpha = e.alpha * 0.5 * (1 - progress);
          ctx.stroke();
          e.life--;
      } else if (e.type === "arrow-explosion") {
          // 弓箭爆炸特效
          const progress = 1 - (e.life / 15); // 0 到 1
          e.radius = e.maxRadius * progress;
          ctx.globalAlpha = e.alpha * (1 - progress); // 逐漸淡出
          ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
          e.life--;
      } else if (e.type === "item-star") {
          // 道具收集星星粒子特效
          e.x += e.vx;
          e.y += e.vy;
          const starPos = camera.transform(e.x, e.y);
          ctx.globalAlpha = e.alpha;
          ctx.fillStyle = e.color;
      ctx.beginPath();
          // 繪製小星星（五角星）
          const spikes = 5;
          const outerRadius = e.size;
          const innerRadius = e.size * 0.5;
          for (let i = 0; i < spikes * 2; i++) {
              const angle = (Math.PI / spikes) * i;
              const radius = i % 2 === 0 ? outerRadius : innerRadius;
              const x = starPos.x + Math.cos(angle) * radius;
              const y = starPos.y + Math.sin(angle) * radius;
              if (i === 0) {
                  ctx.moveTo(x, y);
              } else {
                  ctx.lineTo(x, y);
              }
          }
          ctx.closePath();
      ctx.fill();
          e.alpha -= 0.07; // 逐漸淡出
          e.life--;
    }
      
    ctx.restore();
  });
  effects = effects.filter(e => e.life > 0);
  
  // 8. 繪製滑動軌跡（觸控和滑鼠共用）(Screen Coordinates - 不受 Camera 影響)
  // drawTouchTrails 移至 restore 之後，避免受到 scale 影響
  
  ctx.restore();
  
  // 繪製 UI 層 (Touch Trails)
  drawTouchTrails();
  
  // 9. 繪製小地圖
  drawMinimap();
}

function drawHealthBar(ctx, x, y, w, h, cur, max) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x, y, w, h);
    const pct = Math.max(0, Math.min(1, cur / max));
    ctx.fillStyle = pct > 0.5 ? "#4ade80" : pct > 0.2 ? "#facc15" : "#ef4444";
    ctx.fillRect(x, y, w * pct, h);
}

// ========== 小地圖系統 ==========

function drawMinimap() {
    if (!minimapCanvas || !minimapCtx) return;
    
    const mCtx = minimapCtx;
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    
    mCtx.clearRect(0, 0, mw, mh);
    
    // 背景
    mCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    mCtx.fillRect(0, 0, mw, mh);
    
    // 比例尺 (Minimap Size / World Size)
    const scaleX = mw / WORLD_WIDTH_PX;
    const scaleY = mh / WORLD_HEIGHT_PX;
    
    // 繪製邊界
    mCtx.strokeStyle = "rgba(255,255,255,0.3)";
    mCtx.lineWidth = 1;
    mCtx.strokeRect(0, 0, mw, mh);
    
    // 繪製道具 - 根據職業使用不同顏色
    items.forEach(item => {
        if (item) {
            // 根據職業決定顏色
            if (item.role === "mage") {
                mCtx.fillStyle = "#1e40af"; // 暗藍色：指定法師
            } else if (item.role === "archer") {
                mCtx.fillStyle = "#166534"; // 暗綠色：指定弓箭手
            } else if (item.role === "knight") {
                mCtx.fillStyle = "#fbbf24"; // 鮮黃色：指定騎士
    } else {
                mCtx.fillStyle = "#a855f7"; // 紫色：隨機道具
            }
            
            mCtx.beginPath();
            mCtx.arc(item.x * GRID_SIZE * scaleX, item.y * GRID_SIZE * scaleY, 2, 0, Math.PI*2);
            mCtx.fill();
        }
    });
    
    // 繪製敵人 (紅點) - 敵人使用像素座標，需要轉換
    mCtx.fillStyle = "#ef4444";
    enemies.forEach(e => {
        if (e.hp > 0 && !e.dead) {
            mCtx.beginPath();
            mCtx.arc(e.x * scaleX, e.y * scaleY, 1.5, 0, Math.PI*2);
            mCtx.fill();
        }
    });
    
    // 繪製蛇 (白色) - 頭部較大
    mCtx.fillStyle = "#ffffff"; // 白色：玩家本身
    snake.forEach((s, i) => {
        const x = s.renderX * GRID_SIZE * scaleX;
        const y = s.renderY * GRID_SIZE * scaleY;
        mCtx.beginPath();
        mCtx.arc(x, y, i===0 ? 3 : 1.5, 0, Math.PI*2);
        mCtx.fill();
    });
    
    // 繪製 Camera 視野框 (白框)
    mCtx.strokeStyle = "#fff";
    mCtx.lineWidth = 1;
    mCtx.strokeRect(
        camera.x * scaleX, 
        camera.y * scaleY, 
        camera.width * scaleX, 
        camera.height * scaleY
    );
}

// ========== 觸控與輸入系統 ==========

// 獲取 Canvas 相對座標的輔助函數（觸控和滑鼠共用）
function getCanvasCoordinatesFromTouch(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

// ========== 觸控事件 ==========
canvas.addEventListener("touchmove", (e) => {
    e.preventDefault(); // 防止捲動
    const touch = e.touches[0];
    const coords = getCanvasCoordinatesFromTouch(touch);
    addTrailPoint(coords.x, coords.y);
    handleSwipeControl(coords.x, coords.y);
}, { passive: false });

canvas.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    const coords = getCanvasCoordinatesFromTouch(touch);
    touchStartX = coords.x;
    touchStartY = coords.y;
    touchEndX = coords.x;
    touchEndY = coords.y;
    touchEndTime = 0;
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const coords = getCanvasCoordinatesFromTouch(touch);
        touchEndX = coords.x;
        touchEndY = coords.y;
        touchEndTime = Date.now();
        addTrailPoint(touchEndX, touchEndY, true);
    }
}, { passive: false });

// 獲取 Canvas 相對座標的輔助函數
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// ========== 滑鼠事件（與觸控相同的滑動功能）==========
canvas.addEventListener("mousedown", (e) => {
    if (isPaused || isChoosingUpgrade) return;
    isMouseDown = true;
    const coords = getCanvasCoordinates(e);
    touchStartX = coords.x;
    touchStartY = coords.y;
    touchEndX = coords.x;
    touchEndY = coords.y;
    touchEndTime = 0;
    e.preventDefault(); // 防止預設行為
});

canvas.addEventListener("mousemove", (e) => {
    if (!isMouseDown || isPaused || isChoosingUpgrade) return;
    const coords = getCanvasCoordinates(e);
    addTrailPoint(coords.x, coords.y);
    handleSwipeControl(coords.x, coords.y);
    e.preventDefault(); // 防止預設行為
});

canvas.addEventListener("mouseup", (e) => {
    if (!isMouseDown) return;
    isMouseDown = false;
    const coords = getCanvasCoordinates(e);
    touchEndX = coords.x;
    touchEndY = coords.y;
    touchEndTime = Date.now();
    addTrailPoint(touchEndX, touchEndY, true);
    e.preventDefault(); // 防止預設行為
});

// 處理滑鼠離開 Canvas 的情況
canvas.addEventListener("mouseleave", (e) => {
    if (isMouseDown) {
        isMouseDown = false;
        const coords = getCanvasCoordinates(e);
        touchEndX = coords.x;
        touchEndY = coords.y;
        touchEndTime = Date.now();
        addTrailPoint(touchEndX, touchEndY, true);
    }
});

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchEndTime = 0;
let isMouseDown = false; // 滑鼠按下狀態

// 通用的滑動控制處理函數（觸控和滑鼠共用）
function handleSwipeControl(clientX, clientY) {
    const dx = clientX - touchStartX;
    const dy = clientY - touchStartY;
    
    // 簡單閾值判斷
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
            // 水平
            const newDir = { x: dx > 0 ? 1 : -1, y: 0 };
            if (newDir.x !== -direction.x) nextDirection = newDir;
  } else {
            // 垂直
            const newDir = { x: 0, y: dy > 0 ? 1 : -1 };
            if (newDir.y !== -direction.y) nextDirection = newDir;
        }
        // 重置起點以支援連續滑動
        touchStartX = clientX;
        touchStartY = clientY;
    }
}

// 添加軌跡點（觸控和滑鼠共用）
function addTrailPoint(x, y, isEnd = false) {
    touchTrails.push({
        x: x,
        y: y,
        life: 15,
        isEnd: isEnd
    });
}

// 繪製滑動軌跡（觸控和滑鼠共用）
function drawTouchTrails() {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    
    if (touchTrails.length < 2) {
        ctx.restore();
        return;
    }
    
    // 繪製軌跡線
    ctx.beginPath();
    for (let i = 0; i < touchTrails.length - 1; i++) {
        const p1 = touchTrails[i];
        const p2 = touchTrails[i+1];
        // 檢查距離，避免不連續的點連在一起
        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 100) {
             ctx.moveTo(p1.x, p1.y);
             ctx.lineTo(p2.x, p2.y);
        }
    }
    ctx.stroke();
    
    // 繪製箭頭（在軌跡末端）
    if (touchTrails.length >= 2) {
        const lastIndex = touchTrails.length - 1;
        const lastPoint = touchTrails[lastIndex];
        const secondLastPoint = touchTrails[lastIndex - 1];
        
        // 計算方向
        const dx = lastPoint.x - secondLastPoint.x;
        const dy = lastPoint.y - secondLastPoint.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 5) { // 確保有足夠的距離來繪製箭頭
            const angle = Math.atan2(dy, dx);
            const arrowLength = 28; // 增加箭頭長度（從 20 增加到 28）
            const arrowWidth = 12; // 增加箭頭寬度（從 8 增加到 12）
            
            // 箭頭尖端位置
            const arrowTipX = lastPoint.x;
            const arrowTipY = lastPoint.y;
            
            // 箭頭兩側點
            const arrowLeftX = arrowTipX - arrowLength * Math.cos(angle) + arrowWidth * Math.cos(angle + Math.PI / 2);
            const arrowLeftY = arrowTipY - arrowLength * Math.sin(angle) + arrowWidth * Math.sin(angle + Math.PI / 2);
            const arrowRightX = arrowTipX - arrowLength * Math.cos(angle) + arrowWidth * Math.cos(angle - Math.PI / 2);
            const arrowRightY = arrowTipY - arrowLength * Math.sin(angle) + arrowWidth * Math.sin(angle - Math.PI / 2);
            
            // 繪製箭頭（增加不透明度和邊框讓它更明顯）
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; // 增加不透明度（從 0.7 到 0.9）
            ctx.strokeStyle = "rgba(74, 222, 128, 0.8)"; // 添加綠色邊框
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(arrowTipX, arrowTipY);
            ctx.lineTo(arrowLeftX, arrowLeftY);
            ctx.lineTo(arrowRightX, arrowRightY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke(); // 繪製邊框
        }
    }
    
    ctx.restore();
    
    // 衰減
    touchTrails.forEach(p => p.life--);
    touchTrails = touchTrails.filter(p => p.life > 0);
}

// 鍵盤控制
window.addEventListener("keydown", (e) => {
    if (isPaused || isChoosingUpgrade) return;
    const keyMap = {
        "ArrowUp": { x: 0, y: -1 },
        "ArrowDown": { x: 0, y: 1 },
        "ArrowLeft": { x: -1, y: 0 },
        "ArrowRight": { x: 1, y: 0 },
        "w": { x: 0, y: -1 },
        "s": { x: 0, y: 1 },
        "a": { x: -1, y: 0 },
        "d": { x: 1, y: 0 }
    };
    
    const newDir = keyMap[e.key];
    if (newDir) {
        if (newDir.x !== -direction.x && newDir.y !== -direction.y) {
            nextDirection = newDir;
        }
    }
});

// ========== UI Event Listeners ==========

document.getElementById("homeStartBtn").addEventListener("click", () => {
    const name = document.getElementById("homePlayerNameInput").value || "勇者";
    localStorage.setItem("playerName", name);
    startGame();
});

// ========== 排行榜更新函數 ==========
async function updateLeaderboard() {
    const leaderboardListAll = document.getElementById("leaderboardListAll");
    const leaderboardListToday = document.getElementById("leaderboardListToday");
    
    if (!leaderboardListAll || !leaderboardListToday || !window.firebaseLeaderboardRef || !window.firebaseGetDocs) {
        return;
    }
    
    try {
    const leaderboardQuery = window.firebaseQuery(
      window.firebaseLeaderboardRef,
      window.firebaseOrderBy("kills", "desc"),
            window.firebaseLimit(100)
    );
    
    const snapshot = await window.firebaseGetDocs(leaderboardQuery);
    
    const allData = [];
    const todayData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    snapshot.docs.forEach((doc) => {
            try {
      const data = doc.data();
      const record = {
        name: data.name ?? "無名勇者",
        kills: data.kills ?? 0,
        score: data.score ?? 0,
        date: data.date,
      };
      
      allData.push(record);
      
      if (data.date) {
                    // 處理 Firestore Timestamp 或 Date 物件
                    let recordDate;
                    if (data.date.toDate) {
                        // Firestore Timestamp
                        recordDate = data.date.toDate();
                    } else if (data.date instanceof Date) {
                        // 已經是 Date 物件
                        recordDate = data.date;
                    } else {
                        // 嘗試轉換為 Date
                        recordDate = new Date(data.date);
                    }
                    
                    // 檢查日期是否有效
                    if (recordDate && !isNaN(recordDate.getTime())) {
        if (recordDate >= today && recordDate < tomorrow) {
          todayData.push(record);
        }
                    }
                }
            } catch (err) {
                // 跳過有問題的記錄，繼續處理其他記錄
                console.warn("Error processing leaderboard record:", err);
      }
    });
    
    renderLeaderboardList(leaderboardListAll, allData.slice(0, 5));
    renderLeaderboardList(leaderboardListToday, todayData.slice(0, 5));
  } catch (error) {
    console.error("Leaderboard update failed", error);
    if (leaderboardListAll) {
      leaderboardListAll.innerHTML = "<li>排行榜載入失敗。</li>";
    }
    if (leaderboardListToday) {
      leaderboardListToday.innerHTML = "<li>排行榜載入失敗。</li>";
    }
  }
}

function renderLeaderboardList(listElement, data) {
  if (!listElement) return;
  
  if (data.length === 0) {
    listElement.innerHTML = "<li>尚無紀錄，快來寫下第一筆吧！</li>";
    return;
  }
  
  listElement.innerHTML = "";
  data.forEach((record) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="lb-name">${escapeHtml(record.name)}</span>
      <span class="lb-kills">${record.kills} 擊殺</span>
      <span class="lb-score">${record.score} 格</span>
    `;
    listElement.appendChild(li);
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ========== 遊戲說明渲染 ==========
let currentGuideTab = "quick"; // 預設分頁

function renderGuidePanel() {
    const guidePanel = document.getElementById("guidePanel");
    if (!guidePanel || !window.GUIDE_CONFIG) return;

    const config = window.GUIDE_CONFIG;
    
    // 構建 Tab 按鈕
    let tabsHtml = "";
    if (config.tabs) {
        tabsHtml += `<div class="guide-tabs">`;
        config.tabs.forEach(tab => {
            const isActive = tab.id === currentGuideTab ? "active" : "";
            tabsHtml += `<button class="guide-tab-btn ${isActive}" onclick="switchGuideTab('${tab.id}')">${tab.title}</button>`;
        });
        tabsHtml += `</div>`;
    }
    
    // 構建內容
    let contentHtml = `<div class="guide-content">`;
    
    // 如果有 tabs，根據 currentGuideTab 渲染
    if (config.tabs) {
        const currentTab = config.tabs.find(t => t.id === currentGuideTab) || config.tabs[0];
        if (currentTab.content) {
            // 渲染 items 列表 (快速指引)
            if (currentTab.content.intro) {
                contentHtml += `<p>${escapeHtml(currentTab.content.intro)}</p>`;
            }
            if (currentTab.content.items && currentTab.content.items.length > 0) {
                contentHtml += `<ul class="icon-list">`;
                currentTab.content.items.forEach((item) => {
                    contentHtml += `
                        <li>
                          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt || "")}" />
                          <div>
                            <strong>${escapeHtml(item.name)}</strong>
                            <p>${escapeHtml(item.description)}</p>
                          </div>
                        </li>
                    `;
                });
                contentHtml += `</ul>`;
            }
        } else if (currentTab.html) {
            // 渲染自定義 HTML (進階規則)
            contentHtml += currentTab.html;
        }
    } else {
        // Fallback: 舊格式配置
        if (config.title && config.title.trim()) {
            contentHtml += `<h2>${escapeHtml(config.title)}</h2>`;
        }
        if (config.intro) {
            contentHtml += `<p>${escapeHtml(config.intro)}</p>`;
        }
        if (config.items && config.items.length > 0) {
            contentHtml += `<ul class="icon-list">`;
            config.items.forEach((item) => {
                contentHtml += `
                    <li>
                      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt || "")}" />
                      <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <p>${escapeHtml(item.description)}</p>
                      </div>
                    </li>
                `;
            });
            contentHtml += `</ul>`;
        }
    }
    
    contentHtml += `</div>`;
    
    guidePanel.innerHTML = tabsHtml + contentHtml;
}

// 切換分頁函數
window.switchGuideTab = function(tabId) {
    currentGuideTab = tabId;
    renderGuidePanel();
};

// 主選單排行榜按鈕
const homeLeaderboardBtn = document.getElementById("homeLeaderboardBtn");
if (homeLeaderboardBtn) {
    homeLeaderboardBtn.addEventListener("click", () => {
        if (leaderboardModal) {
            // 從首頁打開，隱藏重新開始按鈕和回主選單按鈕（使用 X 關閉）
            const leaderboardRestartBtn = document.getElementById("leaderboardRestartBtn");
            const leaderboardHomeBtn = document.getElementById("leaderboardHomeBtn");
            if (leaderboardRestartBtn) {
                leaderboardRestartBtn.style.display = "none";
            }
            if (leaderboardHomeBtn) {
                leaderboardHomeBtn.style.display = "none";
            }
            
            leaderboardModal.classList.remove("hidden");
            // 使用 try-catch 避免錯誤導致當機
            try {
                updateLeaderboard().catch(err => {
                    console.error("Leaderboard update error:", err);
                });
            } catch (err) {
                console.error("Leaderboard update error:", err);
            }
        }
    });
}

// 主選單遊戲說明按鈕
const homeGuideBtn = document.getElementById("homeGuideBtn");
if (homeGuideBtn) {
    homeGuideBtn.addEventListener("click", () => {
        if (guideModal) {
            guideModal.classList.remove("hidden");
    renderGuidePanel();
        }
    });
}

// 遊戲中的遊戲說明按鈕也需要渲染
if (guideBtn) {
    guideBtn.addEventListener("click", () => {
        isPaused = true;
        if (guideModal) {
            guideModal.classList.remove("hidden");
    renderGuidePanel();
        }
    });
}

if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
        isPaused = true;
        if (pauseModal) {
            pauseModal.classList.remove("hidden");
        }
    });
}

// 排行榜按鈕（遊戲中）
if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", () => {
        isPaused = true;
        if (leaderboardModal) {
            // 從遊戲中打開，隱藏重新開始按鈕和回主選單按鈕（使用 X 關閉）
            const leaderboardRestartBtn = document.getElementById("leaderboardRestartBtn");
            const leaderboardHomeBtn = document.getElementById("leaderboardHomeBtn");
            if (leaderboardRestartBtn) {
                leaderboardRestartBtn.style.display = "none";
            }
            if (leaderboardHomeBtn) {
                leaderboardHomeBtn.style.display = "none";
            }
            
            leaderboardModal.classList.remove("hidden");
            // 使用 try-catch 避免錯誤導致當機
            try {
                updateLeaderboard().catch(err => {
                    console.error("Leaderboard update error:", err);
                });
            } catch (err) {
                console.error("Leaderboard update error:", err);
            }
        }
    });
}

// Modal 關閉按鈕
const guideCloseBtn = document.getElementById("guideCloseBtn");
const leaderboardCloseBtn = document.getElementById("leaderboardCloseBtn");


if (leaderboardCloseBtn) {
    leaderboardCloseBtn.addEventListener("click", () => {
        if (leaderboardModal) {
            leaderboardModal.classList.add("hidden");
        }
        // 如果遊戲還在進行，恢復遊戲
        if (!isGameOver && isPaused) {
            isPaused = false;
            startCountdown();
        }
    });
}

// ========== 測試修改功能 ==========
const DEBUG_PASSWORD = "690630";
const debugBtn = document.getElementById("debugBtn");
const debugPasswordModal = document.getElementById("debugPasswordModal");
const debugPasswordCloseBtn = document.getElementById("debugPasswordCloseBtn");
const debugPasswordInput = document.getElementById("debugPasswordInput");
const debugPasswordSubmit = document.getElementById("debugPasswordSubmit");
const debugPasswordError = document.getElementById("debugPasswordError");
const debugModal = document.getElementById("debugModal");
const debugCloseBtn = document.getElementById("debugCloseBtn");
const debugPanel = document.getElementById("debugPanel");

// 測試按鈕點擊
if (debugBtn) {
    debugBtn.addEventListener("click", () => {
        isPaused = true;
        if (debugPasswordModal) {
            debugPasswordModal.classList.remove("hidden");
            if (debugPasswordInput) {
                debugPasswordInput.value = "";
                debugPasswordInput.focus();
            }
            if (debugPasswordError) {
                debugPasswordError.style.display = "none";
            }
        }
    });
}

// 密碼輸入框關閉按鈕
if (debugPasswordCloseBtn) {
    debugPasswordCloseBtn.addEventListener("click", () => {
        if (debugPasswordModal) {
            debugPasswordModal.classList.add("hidden");
        }
        if (!isGameOver && isPaused) {
            startCountdown();
        }
    });
}

// 密碼確認按鈕
if (debugPasswordSubmit) {
    debugPasswordSubmit.addEventListener("click", () => {
        const password = debugPasswordInput ? debugPasswordInput.value : "";
        if (password === DEBUG_PASSWORD) {
            // 密碼正確，關閉密碼輸入框，打開修改視窗
            if (debugPasswordModal) {
                debugPasswordModal.classList.add("hidden");
            }
            if (debugModal) {
                debugModal.classList.remove("hidden");
                renderDebugPanel();
            }
} else {
            // 密碼錯誤
            if (debugPasswordError) {
                debugPasswordError.style.display = "block";
            }
        }
    });
}

// 密碼輸入框按下 Enter 鍵
if (debugPasswordInput) {
    debugPasswordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            if (debugPasswordSubmit) {
                debugPasswordSubmit.click();
            }
        }
    });
}

// 修改視窗關閉按鈕
if (debugCloseBtn) {
    debugCloseBtn.addEventListener("click", () => {
        if (debugModal) {
            debugModal.classList.add("hidden");
        }
        if (!isGameOver && isPaused) {
            startCountdown();
        }
    });
}

// 計算總能力等級數（用於同步玩家等級）
function getTotalUpgradeLevels() {
    let total = 0;
    Object.keys(upgradeLevels).forEach(role => {
        Object.keys(upgradeLevels[role]).forEach(key => {
            total += upgradeLevels[role][key] || 0;
        });
    });
    return total;
}

// 同步玩家等級與能力等級
function syncPlayerLevelWithUpgrades() {
    if (!window.UPGRADE_CONFIG) return;
    
    const totalUpgradeLevels = getTotalUpgradeLevels();
    const config = window.UPGRADE_CONFIG.leveling;
    
    // 玩家等級應該至少等於總能力等級（每次升級可以選一次）
    // 但我們可以讓玩家等級稍微高一點，以反映遊戲進度
    const targetPlayerLevel = Math.max(1, totalUpgradeLevels);
    
    // 如果目標等級高於當前等級，更新玩家等級和經驗值
    if (targetPlayerLevel > playerLevelValue) {
        playerLevelValue = targetPlayerLevel;
        if (playerLevelValue > maxLevelThisRun) {
            maxLevelThisRun = playerLevelValue;
        }
        
        // 計算當前等級所需的經驗值，並設置為接近升級但未升級的狀態
        // 這樣玩家可以通過擊殺怪物來升級
        const requiredExp = Math.floor(config.baseExp * Math.pow(playerLevelValue, config.expMultiplier));
        playerExp = Math.floor(requiredExp * 0.9); // 設置為 90%，讓玩家可以通過擊殺來升級
    } else if (targetPlayerLevel < playerLevelValue) {
        // 如果能力等級減少，也相應減少玩家等級
        playerLevelValue = Math.max(1, targetPlayerLevel);
        const requiredExp = Math.floor(config.baseExp * Math.pow(playerLevelValue, config.expMultiplier));
        playerExp = Math.floor(requiredExp * 0.9);
    }
    
    // 更新 UI
    updateLevelUI();
}

// 渲染測試修改面板
function renderDebugPanel() {
    if (!debugPanel || !window.UPGRADE_CONFIG) return;
    
    const config = window.UPGRADE_CONFIG.upgrades;
    const abilityTypeLimit = window.UPGRADE_CONFIG.abilityTypeLimit || 10;
    const isAtLimit = unlockedAbilityTypes.size >= abilityTypeLimit;
    
    let html = "";
    
    Object.keys(config).forEach(role => {
        Object.keys(config[role]).forEach(key => {
            const upgrade = config[role][key];
            const currentLevel = upgradeLevels[role][key];
            const abilityTypeKey = `${role}.${key}`;
            const isUnlocked = unlockedAbilityTypes.has(abilityTypeKey);
            const isDisabled = !isUnlocked && isAtLimit;
            
            const roleNames = {
                mage: "法師",
                archer: "弓箭手",
                knight: "騎士",
                leader: "隊長"
            };
            
            html += `
                <div class="debug-item ${isDisabled ? 'disabled' : ''}" data-role="${role}" data-key="${key}">
                    <div class="debug-item-info">
                        <div class="debug-item-name">${roleNames[role]} - ${upgrade.name}</div>
                        <div class="debug-item-desc">${upgrade.description.replace("{value}", Math.abs(upgrade.increment || 0)).replace("{damage}", upgrade.damageIncrement || 0)} (最大 Lv${upgrade.maxLevel})</div>
                    </div>
                    <div class="debug-item-controls">
                        <button class="debug-btn-control debug-decrease" data-role="${role}" data-key="${key}">−</button>
                        <span class="debug-level-display">Lv ${currentLevel}</span>
                        <button class="debug-btn-control debug-increase" data-role="${role}" data-key="${key}">+</button>
                    </div>
                </div>
            `;
        });
    });
    
    debugPanel.innerHTML = html;
    
    // 綁定加減按鈕事件
    const decreaseBtns = debugPanel.querySelectorAll(".debug-decrease");
    const increaseBtns = debugPanel.querySelectorAll(".debug-increase");
    
    decreaseBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const role = btn.getAttribute("data-role");
            const key = btn.getAttribute("data-key");
            if (upgradeLevels[role][key] > 0) {
                const abilityTypeKey = `${role}.${key}`;
                const wasUnlocked = unlockedAbilityTypes.has(abilityTypeKey);
                
                upgradeLevels[role][key]--;
                
                // 如果減到 0，從已解鎖列表中移除
                if (upgradeLevels[role][key] === 0 && wasUnlocked) {
                    unlockedAbilityTypes.delete(abilityTypeKey);
                    updateAbilityTypeUI();
                }
                
                // 同步更新玩家等級
                syncPlayerLevelWithUpgrades();
                
                renderDebugPanel(); // 重新渲染
            }
        });
    });
    
    increaseBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const role = btn.getAttribute("data-role");
            const key = btn.getAttribute("data-key");
            const upgrade = config[role][key];
            const abilityTypeKey = `${role}.${key}`;
            const isUnlocked = unlockedAbilityTypes.has(abilityTypeKey);
            
            // 檢查是否可以增加
            if (!isUnlocked && isAtLimit) {
                return; // 達到能力類型上限，不能解鎖新能力
            }
            
            if (upgradeLevels[role][key] < upgrade.maxLevel) {
                upgradeLevels[role][key]++;
                
                // 如果是第一次升級，加入已解鎖列表
                if (upgradeLevels[role][key] === 1 && !isUnlocked) {
                    unlockedAbilityTypes.add(abilityTypeKey);
                    updateAbilityTypeUI();
                }
                
                // 同步更新玩家等級
                syncPlayerLevelWithUpgrades();
                
                renderDebugPanel(); // 重新渲染
            }
        });
    });
}

// 排行榜按鈕（重新開始和回主選單）
const leaderboardRestartBtn = document.getElementById("leaderboardRestartBtn");
const leaderboardHomeBtn = document.getElementById("leaderboardHomeBtn");

if (leaderboardRestartBtn) {
    leaderboardRestartBtn.addEventListener("click", () => {
        if (leaderboardModal) {
            leaderboardModal.classList.add("hidden");
        }
        // 重置遊戲狀態
        isPaused = false;
        isGameOver = false;
        // 重新開始遊戲
        startGame();
    });
}

if (leaderboardHomeBtn) {
    leaderboardHomeBtn.addEventListener("click", () => {
        if (leaderboardModal) {
            leaderboardModal.classList.add("hidden");
        }
        // 重置遊戲狀態
        isPaused = false;
        isGameOver = false;
        // 重新載入頁面回到主選單
        window.location.reload();
    });
}

if (guideCloseBtn) {
    guideCloseBtn.addEventListener("click", () => {
        if (guideModal) {
            guideModal.classList.add("hidden");
        }
        // 檢查是否還有其他 Modal 打開，如果沒有且遊戲還在進行，開始倒數
        if (!pauseModal || pauseModal.classList.contains("hidden")) {
            if (!leaderboardModal || leaderboardModal.classList.contains("hidden")) {
                // 如果遊戲還在進行（非遊戲結束狀態），開始倒數
                if (!isGameOver && isPaused) {
                    startCountdown();
                }
            }
        }
    });
}

// 暫停 Modal 關閉按鈕（X 按鈕，功能與繼續遊戲相同）
const pauseCloseBtn = document.getElementById("pauseCloseBtn");
if (pauseCloseBtn) {
    pauseCloseBtn.addEventListener("click", () => {
        if (pauseModal) {
            pauseModal.classList.add("hidden");
        }
        startCountdown();
    });
}

const pauseResumeBtn = document.getElementById("pauseResumeBtn");
if (pauseResumeBtn) {
    pauseResumeBtn.addEventListener("click", () => {
        if (pauseModal) {
            pauseModal.classList.add("hidden");
        }
        startCountdown();
    });
}

const pauseHomeBtn = document.getElementById("pauseHomeBtn");
if (pauseHomeBtn) {
    pauseHomeBtn.addEventListener("click", () => {
        window.location.reload(); // 簡單重置
    });
}

async function triggerGameOver() {
    isGameOver = true;
    gameOverOverlay.classList.remove("hidden");
    document.getElementById("maxLengthValue").innerText = maxLengthThisRun;
    document.getElementById("finalKillValue").innerText = killCount;
    document.getElementById("maxLevelValue").innerText = maxLevelThisRun;
    
    // 從 localStorage 讀取勇者名並填入輸入框
    const playerNameInput = document.getElementById("playerNameInput");
    if (playerNameInput) {
  const savedName = localStorage.getItem("playerName");
        if (savedName) {
            playerNameInput.value = savedName;
        }
    }
    
    // 清空上傳狀態訊息
    const uploadStatus = document.getElementById("uploadStatus");
    if (uploadStatus) {
        uploadStatus.textContent = "";
    }
    
    // 檢查是否進入今日前五名，決定是否顯示上傳按鈕
    const uploadForm = document.querySelector(".upload-form");
    const uploadScoreBtn = document.getElementById("uploadScoreBtn");
    const gameOverLeaderboardBtn = document.getElementById("gameOverLeaderboardBtn");
    
    if (uploadForm && uploadScoreBtn) {
        try {
            // 獲取今日排行榜前五名
            const todayData = await getTodayLeaderboardTop5();
            
            // 如果今日記錄少於 5 筆，或者擊殺數大於等於第 5 名的擊殺數，則顯示上傳按鈕
            const canUpload = todayData.length < 5 || killCount >= (todayData[todayData.length - 1]?.kills || 0);
            
            if (canUpload) {
                uploadForm.style.display = "flex";
                uploadScoreBtn.style.display = "block";
                // 隱藏排行榜按鈕
                if (gameOverLeaderboardBtn) {
                    gameOverLeaderboardBtn.style.display = "none";
    }
  } else {
                uploadForm.style.display = "none";
                uploadScoreBtn.style.display = "none";
                // 顯示排行榜按鈕
                if (gameOverLeaderboardBtn) {
                    gameOverLeaderboardBtn.style.display = "block";
                }
            }
        } catch (error) {
            // 如果獲取排行榜失敗，預設顯示上傳按鈕（允許上傳）
            console.warn("Failed to check leaderboard, showing upload button:", error);
            if (uploadForm) uploadForm.style.display = "flex";
            if (uploadScoreBtn) uploadScoreBtn.style.display = "block";
            if (gameOverLeaderboardBtn) {
                gameOverLeaderboardBtn.style.display = "none";
            }
        }
    }
}

// 獲取今日排行榜前五名
async function getTodayLeaderboardTop5() {
    if (!window.firebaseLeaderboardRef || !window.firebaseGetDocs) {
        return [];
    }
    
    try {
        const leaderboardQuery = window.firebaseQuery(
            window.firebaseLeaderboardRef,
            window.firebaseOrderBy("kills", "desc"),
            window.firebaseLimit(100)
        );
        
        const snapshot = await window.firebaseGetDocs(leaderboardQuery);
        
        const todayData = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        snapshot.docs.forEach((doc) => {
            try {
                const data = doc.data();
                if (data.date) {
                    let recordDate;
                    if (data.date.toDate) {
                        recordDate = data.date.toDate();
                    } else if (data.date instanceof Date) {
                        recordDate = data.date;
                    } else {
                        recordDate = new Date(data.date);
                    }
                    
                    if (recordDate && !isNaN(recordDate.getTime())) {
                        if (recordDate >= today && recordDate < tomorrow) {
                            todayData.push({
                                kills: data.kills ?? 0,
                                score: data.score ?? 0,
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn("Error processing leaderboard record:", err);
            }
        });
        
        // 按擊殺數排序並取前五名
        todayData.sort((a, b) => b.kills - a.kills);
        return todayData.slice(0, 5);
    } catch (error) {
        console.error("Failed to get today leaderboard:", error);
        return [];
    }
}

document.getElementById("restartBtn").addEventListener("click", startGame);
document.getElementById("homeBtn").addEventListener("click", () => window.location.reload());

// Game Over 排行榜按鈕
const gameOverLeaderboardBtn = document.getElementById("gameOverLeaderboardBtn");
if (gameOverLeaderboardBtn) {
    gameOverLeaderboardBtn.addEventListener("click", () => {
        // 關閉 Game Over Modal
        if (gameOverOverlay) {
            gameOverOverlay.classList.add("hidden");
        }
        // 確保遊戲狀態正確
        isGameOver = true;
        isPaused = true;
        // 顯示排行榜 Modal
        if (leaderboardModal) {
            // 從死亡時打開，顯示重新開始按鈕，隱藏回主選單按鈕（使用 X 關閉）
            const leaderboardRestartBtn = document.getElementById("leaderboardRestartBtn");
            const leaderboardHomeBtn = document.getElementById("leaderboardHomeBtn");
            if (leaderboardRestartBtn) {
                leaderboardRestartBtn.style.display = "block";
            }
            if (leaderboardHomeBtn) {
                leaderboardHomeBtn.style.display = "none";
            }
            
            leaderboardModal.classList.remove("hidden");
            // 更新排行榜內容
            try {
                updateLeaderboard().catch(err => {
                    console.error("Leaderboard update error:", err);
                });
            } catch (err) {
                console.error("Leaderboard update error:", err);
            }
        }
    });
}

// ========== 上傳分數功能 ==========
const uploadScoreBtn = document.getElementById("uploadScoreBtn");
const uploadStatus = document.getElementById("uploadStatus");

if (uploadScoreBtn) {
    uploadScoreBtn.addEventListener("click", async () => {
        const nameInput = document.getElementById("playerNameInput");
        const name = nameInput ? nameInput.value.trim() : "";
        
    if (!name) {
            if (uploadStatus) {
                uploadStatus.textContent = "請輸入勇者名";
                uploadStatus.style.color = "#ef4444";
      }
      return;
    }
        
        if (!window.firebaseReady || !window.firebaseAddDoc || !window.firebaseLeaderboardRef) {
            if (uploadStatus) {
                uploadStatus.textContent = "Firebase 未就緒，請檢查網路連線";
                uploadStatus.style.color = "#ef4444";
            }
            return;
        }
        
        if (killCount === 0) {
            if (uploadStatus) {
                uploadStatus.textContent = "擊殺數為 0，無法上傳";
                uploadStatus.style.color = "#ef4444";
            }
            return;
        }
        
    // 保存名字
    localStorage.setItem("playerName", name);
        
        // 上傳分數
        if (uploadStatus) {
            uploadStatus.textContent = "上傳中...";
            uploadStatus.style.color = "#94a3b8";
        }
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            await window.firebaseAddDoc(window.firebaseLeaderboardRef, {
                name: name,
                kills: killCount,
                score: maxLengthThisRun,
                level: maxLevelThisRun,
                date: window.firebaseTimestamp ? window.firebaseTimestamp.now() : new Date(),
                timestamp: Date.now()
            });
            
            // 上傳成功後自動顯示排行榜（不顯示"上傳成功"訊息）
            if (leaderboardModal) {
                // 清空上傳狀態訊息
                if (uploadStatus) {
                    uploadStatus.textContent = "";
                }
                
                // 關閉 Game Over Modal
                const gameOverOverlay = document.getElementById("gameOverOverlay");
                if (gameOverOverlay) {
                    gameOverOverlay.classList.add("hidden");
                }
                // 確保遊戲狀態正確（停止遊戲循環）
                isGameOver = true;
                isPaused = true;
                // 顯示排行榜 Modal
                // 從死亡時打開，顯示重新開始按鈕，隱藏回主選單按鈕（使用 X 關閉）
                const leaderboardRestartBtn = document.getElementById("leaderboardRestartBtn");
                const leaderboardHomeBtn = document.getElementById("leaderboardHomeBtn");
                if (leaderboardRestartBtn) {
                    leaderboardRestartBtn.style.display = "block";
                }
                if (leaderboardHomeBtn) {
                    leaderboardHomeBtn.style.display = "none";
                }
                
                leaderboardModal.classList.remove("hidden");
                // 更新排行榜內容（使用 try-catch 避免錯誤導致當機）
                try {
                    updateLeaderboard().catch(err => {
                        console.error("Leaderboard update error:", err);
                        // 即使更新失敗，也不影響顯示
                    });
                } catch (err) {
                    console.error("Leaderboard update error:", err);
                }
            }
        } catch (error) {
            console.error("Upload failed", error);
            if (uploadStatus) {
                uploadStatus.textContent = "上傳失敗：" + (error.message || "未知錯誤");
                uploadStatus.style.color = "#ef4444";
            }
        }
    });
}

function startCountdown() {
    isCountdown = true;
    let count = 3;
    if (countdownOverlay) {
        countdownOverlay.classList.remove("hidden");
    }
    if (countdownNumber) {
        countdownNumber.innerText = count;
    }
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            if (countdownNumber) {
                countdownNumber.innerText = count;
                // reset animation
                countdownNumber.style.animation = 'none';
                countdownNumber.offsetHeight; /* trigger reflow */
                countdownNumber.style.animation = null;
            }
        } else {
            clearInterval(interval);
            if (countdownOverlay) {
                countdownOverlay.classList.add("hidden");
            }
            isCountdown = false;
            isPaused = false;
        }
    }, 1000);
}


