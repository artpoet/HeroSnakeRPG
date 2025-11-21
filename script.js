const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const killValue = document.getElementById("killValue");
const overlay = document.getElementById("gameOverOverlay");
const restartBtn = document.getElementById("restartBtn");
const loaderText = document.getElementById("loaderText");
const loaderBar = document.getElementById("loaderBar");
const maxLengthValue = document.getElementById("maxLengthValue");
const finalKillValue = document.getElementById("finalKillValue");
const leaderboardListAll = document.getElementById("leaderboardListAll");
const leaderboardListToday = document.getElementById("leaderboardListToday");
const playerNameInput = document.getElementById("playerNameInput");
const uploadScoreBtn = document.getElementById("uploadScoreBtn");
const uploadStatus = document.getElementById("uploadStatus");
const playerLevel = document.getElementById("playerLevel");
const expText = document.getElementById("expText");
const expBarFill = document.getElementById("expBarFill");
const upgradeOverlay = document.getElementById("upgradeOverlay");
const upgradeOptions = document.getElementById("upgradeOptions");
const maxLevelValue = document.getElementById("maxLevelValue");

// ========== 主選單相關元素 ==========
const homeScreen = document.getElementById("homeScreen");
const homeLoader = document.getElementById("homeLoader");
const homeMenu = document.getElementById("homeMenu");
const homePlayerNameInput = document.getElementById("homePlayerNameInput");
const homeStartBtn = document.getElementById("homeStartBtn");
const homeLeaderboardBtn = document.getElementById("homeLeaderboardBtn");
const homeGuideBtn = document.getElementById("homeGuideBtn");

// ========== 遊戲畫面相關元素 ==========
const gameScreen = document.getElementById("gameScreen");
const pauseBtn = document.getElementById("pauseBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const guideBtn = document.getElementById("guideBtn");

// ========== Modal 相關元素 ==========
const leaderboardModal = document.getElementById("leaderboardModal");
const leaderboardCloseBtn = document.getElementById("leaderboardCloseBtn");
const guideModal = document.getElementById("guideModal");
const guideCloseBtn = document.getElementById("guideCloseBtn");
const guidePanel = document.getElementById("guidePanel");
const pauseModal = document.getElementById("pauseModal");
const pauseCloseBtn = document.getElementById("pauseCloseBtn");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const pauseHomeBtn = document.getElementById("pauseHomeBtn");
const homeBtn = document.getElementById("homeBtn");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = document.getElementById("countdownNumber");

const ARCHER_COOLDOWN = 1000; // 弓箭手冷卻 (毫秒)
const ITEM_COLOR = "#a855f7"; // 道具顏色 (紫色)
const LEADER_MAX_HP = 150; // 隊長血量上限
const LEADER_COLLISION_DAMAGE = 35; // 隊長被撞傷害
const LEADER_HEAL_ON_KILL = 10; // 擊殺敵人回復量
const ASSET_BASE_PATH = "";

const assetDefinitions = {
  leader: {
    src: `leader.png`,
    fallback: (x, y, size) => {
      drawFallbackBlock("#ef4444", () => {
        ctx.fillStyle = "#fff";
        ctx.font = `${size * 0.4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👑", x + size / 2, y + size / 2);
      }, x, y, size);
    },
  },
  archer: {
    src: `archer.png`,
    fallback: (x, y, size) => {
      drawFallbackBlock("#22c55e", () => {
        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + size * 0.2, y + size * 0.8);
        ctx.lineTo(x + size * 0.8, y + size * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.75, y + size * 0.25, size * 0.15, 0, Math.PI * 2);
        ctx.stroke();
      }, x, y, size);
    },
  },
  mage: {
    src: `mage.png`,
    fallback: (x, y, size) => {
      drawFallbackBlock("#3b82f6", () => {
        ctx.fillStyle = "#f0f9ff";
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + size * 0.2);
        ctx.lineTo(x + size * 0.6, y + size * 0.8);
        ctx.lineTo(x + size * 0.4, y + size * 0.8);
        ctx.closePath();
        ctx.fill();
      }, x, y, size);
    },
  },
  knight: {
    src: `knight.png`,
    fallback: (x, y, size) => {
      drawFallbackBlock("#facc15", () => {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(x + size * 0.3, y + size * 0.2, size * 0.4, size * 0.5);
        ctx.beginPath();
        ctx.arc(x + size * 0.5, y + size * 0.4, size * 0.2, Math.PI, 0);
        ctx.fill();
      }, x, y, size);
    },
  },
  enemy: {
    src: `enemy.png`,
    fallback: (x, y, size) => {
      drawFallbackBlock("#efefef", () => {
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }, x, y, size);
    },
  },
  item: {
    src: `item.png`,
    fallback: (x, y, size) => {
      ctx.fillStyle = ITEM_COLOR;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    },
  },
};

const TOTAL_ASSETS = Object.keys(assetDefinitions).length;
const ASSETS = Object.fromEntries(
  Object.entries(assetDefinitions).map(([key, def]) => [
    key,
    createAsset(def.src, def.fallback),
  ])
);

const SEGMENT_TYPES = ["archer", "mage", "knight"];
const BORDER_COLORS = ["#ef4444", "#eab308", "#3b82f6", "#22c55e"]; // 紅、黃、藍、綠

// 玩家顏色系統（為多玩家預留）
let playerColors = {}; // { playerId: color }
let currentPlayerId = "player1"; // 當前玩家 ID（目前只有一個玩家）
let currentPlayerColor = null; // 當前玩家的顏色

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let facing = 1; // 1 = 向右，-1 = 向左
let gridWidth = 20; // 初始值，會在 resizeCanvas 中更新
let gridHeight = 15; // 初始值，會在 resizeCanvas 中更新
let item = null;
let recruitQueue = [];
let enemies = [];
let projectiles = [];
let effects = [];
let lastMoveTime = 0;
let lastEnemySpawn = 0;
let isGameOver = false;
let isPaused = false; // 遊戲暫停狀態
let isCountdown = false; // 倒數計時狀態
let animationId = null;
let leaderHP = LEADER_MAX_HP;
let killCount = 0;
let maxLengthThisRun = 1;
let assetsLoaded = 0;
let assetsReady = false;
let isUploading = false;
let hasUploadedThisRun = false;

// ========== 等級與經驗值系統 ==========
// 玩家等級和經驗值，經驗值滿了會升級
// 升級公式：所需經驗值 = baseExp * (等級 ^ expMultiplier)
// 配置檔案：upgrade-config.js
let playerLevelValue = 1;      // 玩家當前等級
let playerExp = 0;              // 玩家當前經驗值
let maxLevelThisRun = 1;       // 本局最高等級
let gameStartTime = 0;          // 遊戲開始時間（用於計算怪物等級）

// ========== 升級系統 ==========
// 追蹤各升級的等級，用於計算升級後的效果
// 配置檔案：upgrade-config.js
let upgradeLevels = {
  mage: {
    auraRange: 0,     // 法師光環範圍等級
    auraDamage: 0,    // 法師光環傷害等級
  },
  archer: {
    arrowCount: 0,    // 弓箭數量等級
    arrowSpeed: 0,    // 射擊速度等級
  },
  knight: {
    hitPoints: 0,     // 可被攻擊次數等級
    deathBonus: 0,    // 死亡後增加隊伍長度等級
  },
  leader: {
    maxHp: 0,         // 隊長最大血量等級
    damage: 0,       // 隊長傷害等級
  },
};

// 升級選擇狀態：選擇升級時會鎖血，避免在選擇過程中死亡
let isChoosingUpgrade = false;

window.updateLeaderboard = updateLeaderboard;

// 頁面載入時更新一次排行榜
if (window.firebaseReady && window.firebaseLeaderboardRef) {
  updateLeaderboard();
} else {
  const checkFirebase = setInterval(() => {
    if (window.firebaseReady && window.firebaseLeaderboardRef) {
      updateLeaderboard();
      clearInterval(checkFirebase);
    }
  }, 100);
}

// 儲存排行榜數據，用於判斷是否進入前10名
let leaderboardData = [];
let todayLeaderboardData = []; // 今日排行榜數據

function createAsset(src, fallback) {
  const img = new Image();
  let loaded = false;
  let counted = false;
  
  function markAssetComplete() {
    if (counted) return;
    counted = true;
    assetsLoaded += 1;
    updateLoaderProgress();
    if (assetsLoaded >= TOTAL_ASSETS) {
      finishLoadingPhase();
    }
  }
  
  img.onload = () => {
    loaded = true;
    markAssetComplete();
  };
  img.onerror = () => {
    loaded = false;
    markAssetComplete();
  };
  img.src = src;
  
  return {
    draw(x, y, size, facing = 1) {
      if (loaded) {
        if (facing === -1) {
          // 向左：翻轉圖片
          ctx.save();
          ctx.translate(x + size, y);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, size, size);
          ctx.restore();
        } else {
          // 向右：正常繪製
          ctx.drawImage(img, x, y, size, size);
        }
      } else {
        fallback(x, y, size);
      }
    },
  };
}

function updateLoaderProgress() {
  if (!loaderBar || !loaderText) return;
  const ratio = TOTAL_ASSETS > 0 ? assetsLoaded / TOTAL_ASSETS : 1;
  loaderBar.style.width = `${Math.min(100, ratio * 100)}%`;
  loaderText.textContent = `載入資產中... ${Math.round(ratio * 100)}%`;
}

function finishLoadingPhase() {
  if (assetsReady) return;
  assetsReady = true;
  setTimeout(() => {
    // 隱藏載入畫面，顯示主選單
    if (homeLoader) {
      homeLoader.classList.add("hidden");
    }
    if (homeMenu) {
      homeMenu.classList.remove("hidden");
    }
    
    // 檢查是否有保存的名字，自動填入
    const savedName = localStorage.getItem("playerName");
    if (savedName && savedName.trim() !== "") {
      if (homePlayerNameInput) {
        homePlayerNameInput.value = savedName;
      }
    }
    
    // 確保主選單顯示
    if (homeScreen) {
      homeScreen.classList.remove("hidden");
    }
    if (gameScreen) {
      gameScreen.classList.add("hidden");
    }
    
    // 調整 Canvas 尺寸
    resizeCanvas();
  }, 200);
}

function drawFallbackBlock(color, drawSymbol, x, y, size) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  drawSymbol();
}

// 為玩家分配顏色（如果該玩家還沒有顏色）
function assignPlayerColor(playerId) {
  if (!playerColors[playerId]) {
    // 找出已經使用的顏色
    const usedColors = Object.values(playerColors);
    // 找出第一個未使用的顏色
    const availableColor = BORDER_COLORS.find(color => !usedColors.includes(color));
    // 如果所有顏色都被使用，則循環使用
    playerColors[playerId] = availableColor || BORDER_COLORS[Object.keys(playerColors).length % BORDER_COLORS.length];
  }
  return playerColors[playerId];
}

// 獲取當前玩家的顏色
function getCurrentPlayerColor() {
  if (!currentPlayerColor) {
    currentPlayerColor = assignPlayerColor(currentPlayerId);
  }
  return currentPlayerColor;
}

// ========== Canvas 尺寸調整 ==========
function resizeCanvas() {
  if (!canvas) return;
  
  // 計算可用空間（考慮 UI 高度）
  const maxWidth = Math.min(800, window.innerWidth - 24);
  const maxHeight = Math.min(600, window.innerHeight - 200);
  
  // 維持 4:3 比例
  let width = maxWidth;
  let height = (width * 3) / 4;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = (height * 4) / 3;
  }
  
  // 設定 Canvas 尺寸
  canvas.width = width;
  canvas.height = height;
  
  // 更新網格尺寸
  gridWidth = Math.floor(canvas.width / GRID_SIZE);
  gridHeight = Math.floor(canvas.height / GRID_SIZE);
}

// 監聽視窗大小變化
window.addEventListener("resize", () => {
  if (!isGameOver && !homeScreen?.classList.contains("hidden")) {
    resizeCanvas();
  }
});

function startGame() {
  if (!assetsReady) return;
  
  // 調整 Canvas 尺寸
  resizeCanvas();
  
  // 切換到遊戲畫面
  if (homeScreen) {
    homeScreen.classList.add("hidden");
  }
  if (gameScreen) {
    gameScreen.classList.remove("hidden");
  }
  
  // 為當前玩家分配顏色
  currentPlayerColor = assignPlayerColor(currentPlayerId);
  const startX = Math.floor(gridWidth / 2);
  const startY = Math.floor(gridHeight / 2);
  snake = [
    {
      x: startX,
      y: startY,
      renderX: startX, // 視覺位置（用於平滑移動）
      renderY: startY,
      role: "leader",
      lastShot: 0,
      borderColor: currentPlayerColor,
    },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  facing = 1; // 重置面向為向右
  recruitQueue = [];
  enemies = [];
  projectiles = [];
  effects = [];
  item = spawnItem();
  scoreValue.textContent = snake.length;
  killCount = 0;
  killValue.textContent = killCount;
  isGameOver = false;
  isPaused = false;
  isCountdown = false;
  overlay.classList.add("hidden");
  
  // 隱藏倒數計時
  if (countdownOverlay) {
    countdownOverlay.classList.add("hidden");
  }
  lastMoveTime = 0;
  lastEnemySpawn = 0;
  leaderHP = LEADER_MAX_HP;
  maxLengthThisRun = snake.length;
  maxLengthValue.textContent = snake.length;
  finalKillValue.textContent = killCount;
  hasUploadedThisRun = false;
  
  // 初始化等級系統
  playerLevelValue = 1;
  playerExp = 0;
  maxLevelThisRun = 1;
  gameStartTime = Date.now();
  upgradeLevels = {
    mage: { auraRange: 0, auraDamage: 0 },
    archer: { arrowCount: 0, arrowSpeed: 0 },
    knight: { hitPoints: 0, deathBonus: 0 },
    leader: { maxHp: 0, damage: 0 },
  };
  isChoosingUpgrade = false;
  updateLevelUI();
  
  resetUploadForm();
  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function spawnItem() {
  const occupied = new Set(snake.map((seg) => `${seg.x},${seg.y}`));
  let spot;
  do {
    spot = {
      x: Math.floor(Math.random() * gridWidth),
      y: Math.floor(Math.random() * gridHeight),
    };
  } while (occupied.has(`${spot.x},${spot.y}`));
  return spot;
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  switch (edge) {
    case 0:
      x = 0;
      y = Math.random() * canvas.height;
      break;
    case 1:
      x = canvas.width;
      y = Math.random() * canvas.height;
      break;
    case 2:
      x = Math.random() * canvas.width;
      y = 0;
      break;
    default:
      x = Math.random() * canvas.width;
      y = canvas.height;
  }
  
  // 計算敵人等級（1-10級）
  const level = calculateEnemyLevel();
  const levelConfig = getEnemyLevelConfig(level);
  
  enemies.push({
    x,
    y,
    hp: levelConfig.hp,
    maxHp: levelConfig.hp,
    tier: level,  // 使用 tier 作為等級顯示（保持向後兼容）
    level: level, // 新增 level 屬性
    damage: levelConfig.damage,
    exp: levelConfig.exp,
    hitTimer: 0,
    hpTextTimer: 0,
    dead: false,
  });
}

// ========== 怪物等級系統 ==========
// 計算敵人等級（1-10級）- 根據玩家等級和出現機率隨機選擇
// 配置檔案：enemy-spawn-config.js（怪物出現機率）
// 配置檔案：upgrade-config.js（怪物屬性計算）
function calculateEnemyLevel() {
  if (!window.ENEMY_SPAWN_CONFIG || !window.ENEMY_SPAWN_CONFIG.spawnByPlayerLevel) {
    // 降級處理：如果沒有配置，使用簡單的等級計算
    if (window.UPGRADE_CONFIG && window.UPGRADE_CONFIG.enemyLevel) {
      const config = window.UPGRADE_CONFIG.enemyLevel;
      return Math.min(playerLevelValue, config.maxLevel);
    }
    return 1; // 預設等級
  }
  
  const spawnConfig = window.ENEMY_SPAWN_CONFIG.spawnByPlayerLevel;
  
  // 根據玩家等級找到對應的生成配置
  let currentConfig = null;
  for (const config of spawnConfig) {
    const [minLevel, maxLevel] = config.playerLevelRange;
    if (playerLevelValue >= minLevel && playerLevelValue <= maxLevel) {
      currentConfig = config;
      break;
    }
  }
  
  // 如果找不到對應配置，使用最後一個配置（最高等級階段）
  if (!currentConfig) {
    currentConfig = spawnConfig[spawnConfig.length - 1];
  }
  
  // 根據權重隨機選擇怪物等級
  const enemyLevels = currentConfig.enemyLevels;
  const totalWeight = enemyLevels.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const enemyLevel of enemyLevels) {
    random -= enemyLevel.weight;
    if (random <= 0) {
      return enemyLevel.level;
    }
  }
  
  // 如果沒有匹配到，返回第一個等級
  return enemyLevels[0].level;
}

// 獲取敵人等級配置（根據等級計算屬性）
// 屬性計算公式：
// - 血量：baseHp + (level - 1) * hpPerLevel
// - 傷害：baseDamage + (level - 1) * damagePerLevel
// - 經驗值：baseExp * level
function getEnemyLevelConfig(level) {
  if (!window.UPGRADE_CONFIG || !window.UPGRADE_CONFIG.enemyLevel) {
    return { 
      hp: ENEMY_HP, 
      damage: LEADER_COLLISION_DAMAGE, 
      exp: 10 
    };
  }
  
  const config = window.UPGRADE_CONFIG.enemyLevel;
  
  // 計算血量：baseHp + (level - 1) * hpPerLevel
  const hp = config.baseHp + (level - 1) * config.hpPerLevel;
  
  // 計算傷害：baseDamage + (level - 1) * damagePerLevel
  const damage = config.baseDamage + (level - 1) * config.damagePerLevel;
  
  // 計算經驗值：baseExp * level
  const exp = config.baseExp * level;
  
  return { hp, damage, exp };
}

/**
 * 移動蛇（隊伍）
 * @param {number} timestamp - 當前時間戳
 * 
 * 功能：
 * 1. 更新 leader 位置
 * 2. 更新所有 segment 位置（跟隨前一個）
 * 3. 邊界檢測和碰撞檢測
 * 4. 根據位移更新每個 segment 的 facing（面向）
 * 5. 處理道具收集和新勇者加入
 */
function moveSnake(timestamp) {
  direction = nextDirection;
  // 更新 leader 面向（只在左右移動時）
  if (direction.x !== 0) {
    facing = direction.x > 0 ? 1 : -1;
  }
  const head = snake[0];
  const nextX = head.x + direction.x;
  const nextY = head.y + direction.y;

  // 邊界檢測：改為完全基於視覺位置來判斷
  // 邏輯位置可以暫時超出邊界，但只有在視覺位置真的超出邊界時才判定死亡
  // 這樣可以確保玩家看到的和實際判定是一致的
  // 注意：邊界檢測會在 gameLoop 中每幀檢查視覺位置，這裡只做基本檢查
  // 如果邏輯位置超出太多（超過 1 格），可能是異常情況，直接判定死亡
  if (nextX < -1 || nextY < -1 || nextX > gridWidth || nextY > gridHeight) {
    return triggerGameOver();
  }

  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === nextX && snake[i].y === nextY) {
      return triggerGameOver();
    }
  }

  const previousPositions = snake.map((segment) => ({
    x: segment.x,
    y: segment.y,
    renderX: segment.renderX !== undefined ? segment.renderX : segment.x,
    renderY: segment.renderY !== undefined ? segment.renderY : segment.y,
  }));

  // 更新邏輯位置
  head.x = nextX;
  head.y = nextY;

  // 更新所有 segment 的位置和面向
  for (let i = 1; i < snake.length; i++) {
    // 保存移動前的位置，用於判斷面向
    const prevX = snake[i].x;
    // 更新位置：移動到前一個 segment 之前的位置
    snake[i].x = previousPositions[i - 1].x;
    snake[i].y = previousPositions[i - 1].y;
    // 根據自己的左右位移決定面向
    const currentX = snake[i].x;
    if (currentX !== prevX) {
      // 有左右移動，根據移動方向決定面向
      snake[i].facing = currentX > prevX ? 1 : -1; // 向右 = 1，向左 = -1
    }
    // 如果沒有左右移動（上下移動），保持原來的 facing（不更新）
    // 保持視覺位置不變，等待插值
    if (snake[i].renderX === undefined) {
      snake[i].renderX = previousPositions[i - 1].renderX;
      snake[i].renderY = previousPositions[i - 1].renderY;
    }
  }
  
  // 確保頭部的視覺位置也正確初始化
  if (head.renderX === undefined) {
    head.renderX = previousPositions[0].renderX;
    head.renderY = previousPositions[0].renderY;
  }

  if (item && nextX === item.x && nextY === item.y) {
    recruitQueue.push(
      SEGMENT_TYPES[Math.floor(Math.random() * SEGMENT_TYPES.length)]
    );
    item = spawnItem();
  }

  if (recruitQueue.length > 0) {
    const lastPrev = previousPositions[previousPositions.length - 1];
    const newRole = recruitQueue.shift();
    snake.push({
      x: lastPrev.x,
      y: lastPrev.y,
      renderX: lastPrev.renderX || lastPrev.x,
      renderY: lastPrev.renderY || lastPrev.y,
      role: newRole,
      lastShot: 0,
      borderColor: getCurrentPlayerColor(), // 使用當前玩家的顏色
      facing: facing, // 新加入的勇者也要跟 leader 保持相同面向
    });
  }

  scoreValue.textContent = snake.length;
  if (snake.length > maxLengthThisRun) {
    maxLengthThisRun = snake.length;
  }
}

function handleArcherAttacks(timestamp) {
  snake.forEach((segment, index) => {
    if (index === 0) return;
    if (segment.role !== "archer") return;
    // 使用升級後的冷卻時間
    const cooldown = getArcherCooldown();
    if (timestamp - (segment.lastShot || 0) < cooldown) return;
    const enemy = findNearestEnemy(segment);
    if (!enemy) return;
    const segCenter = gridToPixel(segment);
    const angle = Math.atan2(enemy.y - segCenter.y, enemy.x - segCenter.x);
    const arrowCount = getArcherArrowCount();
    const arrowSpeed = getArcherArrowSpeed();
    // 發射多支箭矢（如果升級了）
    for (let i = 0; i < arrowCount; i++) {
      const spreadAngle = arrowCount > 1 ? (i - (arrowCount - 1) / 2) * 0.2 : 0;
      // 從稍微遠離弓箭手的位置發射，避免立即與發射者碰撞
      const offsetDistance = GRID_SIZE * 0.6; // 從弓箭手前方一點距離開始
      projectiles.push({
        x: segCenter.x + Math.cos(angle + spreadAngle) * offsetDistance,
        y: segCenter.y + Math.sin(angle + spreadAngle) * offsetDistance,
        vx: Math.cos(angle + spreadAngle) * arrowSpeed,
        vy: Math.sin(angle + spreadAngle) * arrowSpeed,
        damage: ARROW_DAMAGE,
        shooterIndex: index, // 記錄發射者的索引，避免檢測與發射者碰撞
      });
    }
    segment.lastShot = timestamp;
  });
}

function handleMageAura() {
  snake.forEach((segment, index) => {
    if (index === 0) return;
    if (segment.role !== "mage") return;
    const segCenter = gridToPixel(segment);
    const auraRadius = getMageAuraRadius();
    const auraDamage = getMageAuraDamage();
    enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const dist = distance(segCenter.x, segCenter.y, enemy.x, enemy.y);
      if (dist <= auraRadius) {
        damageEnemy(enemy, auraDamage);
        effects.push({
          type: "aura",
          x: segCenter.x,
          y: segCenter.y,
          radius: auraRadius,
          alpha: 0.3,
          fade: 0.015,
        });
      }
    });
  });
}

function findNearestEnemy(segment) {
  let min = Infinity;
  let closest = null;
  const pos = gridToPixel(segment);
  enemies.forEach((enemy) => {
    const dist = distance(pos.x, pos.y, enemy.x, enemy.y);
    if (dist < min) {
      min = dist;
      closest = enemy;
    }
  });
  return closest;
}

function updateProjectiles() {
  projectiles.forEach((proj) => {
    proj.x += proj.vx;
    proj.y += proj.vy;
  });
  projectiles = projectiles.filter((proj) => {
    // 檢查是否超出邊界
    if (
      proj.x < 0 ||
      proj.y < 0 ||
      proj.x > canvas.width ||
      proj.y > canvas.height
    ) {
      return false;
    }
    
    // 檢查是否與隊伍成員碰撞（弓箭不能穿越隊伍）
    // 但跳過發射者本身，避免弓箭一發射就被移除
    for (let i = 0; i < snake.length; i++) {
      // 如果是發射者，跳過檢測（但只跳過第一幀，之後可以碰撞）
      if (proj.shooterIndex === i && proj.framesAlive === undefined) {
        proj.framesAlive = 0;
        continue;
      }
      const segment = snake[i];
      const segCenter = gridToPixel(segment);
      const dist = distance(proj.x, proj.y, segCenter.x, segCenter.y);
      if (dist < GRID_SIZE * 0.4) {
        // 擊中隊伍成員，移除弓箭
        return false;
      }
    }
    
    // 更新弓箭存活幀數（用於判斷是否已離開發射者）
    if (proj.framesAlive !== undefined) {
      proj.framesAlive++;
      // 3 幀後移除 shooterIndex，之後可以與發射者碰撞（如果弓箭回頭）
      if (proj.framesAlive > 3) {
        delete proj.shooterIndex;
      }
    }
    
    // 檢查是否與敵人碰撞
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const dist = distance(proj.x, proj.y, enemy.x, enemy.y);
      if (dist < GRID_SIZE * 0.4) {
        damageEnemy(enemy, proj.damage);
        // 擊中敵人後移除弓箭（不能穿透）
        return false;
      }
    }
    return true;
  });
}

function updateEnemies() {
  const headPixel = gridToPixel(snake[0]);
  enemies.forEach((enemy) => {
    const angle = Math.atan2(headPixel.y - enemy.y, headPixel.x - enemy.x);
    enemy.x += Math.cos(angle) * ENEMY_SPEED;
    enemy.y += Math.sin(angle) * ENEMY_SPEED;
    if (enemy.hitTimer > 0) enemy.hitTimer -= 1;
    if (enemy.hpTextTimer > 0) enemy.hpTextTimer -= 1;
  });
  enemies = enemies.filter((enemy) => enemy.hp > 0 && !enemy.dead);
}

function handleEnemyCollisions() {
  const head = snake[0];
  const headRect = {
    x: head.x * GRID_SIZE,
    y: head.y * GRID_SIZE,
    size: GRID_SIZE,
  };

  const removeSet = new Set();

  enemies = enemies.filter((enemy) => {
    if (rectCircleCollide(headRect, enemy)) {
      damageLeader(LEADER_COLLISION_DAMAGE, enemy.x, enemy.y, enemy);
      spawnExplosion(enemy.x, enemy.y);
      registerKill(enemy.x, enemy.y, enemy.level || enemy.tier || 1);
      return false;
    }
    const bodyResult = handleBodyCollision(enemy, removeSet);
    if (bodyResult === "kill") {
      registerKill(enemy.x, enemy.y, enemy.level || enemy.tier || 1);
      return false;
    }
    if (bodyResult === "survive") {
      return true;
    }
    return enemy.hp > 0 && !enemy.dead;
  });

  if (removeSet.size > 0) {
    snake = snake.filter((_, index) => !removeSet.has(index));
    scoreValue.textContent = snake.length;
  }
}

function handleBodyCollision(enemy, removeSet) {
  let collidedIndex = -1;
  let collidedRect = null;
  for (let i = 1; i < snake.length; i++) {
    if (removeSet.has(i)) continue;
    const segment = snake[i];
    const rect = {
      x: segment.x * GRID_SIZE,
      y: segment.y * GRID_SIZE,
      size: GRID_SIZE,
    };
    if (!rectCircleCollide(rect, enemy)) continue;
    collidedIndex = i;
    collidedRect = rect;
    break;
  }
  if (collidedIndex === -1) return null;

  const collidedSegment = snake[collidedIndex];
  if (collidedSegment.role === "knight") {
    // 處理騎士可被攻擊次數
    if (!collidedSegment.hitPoints) {
      collidedSegment.hitPoints = getKnightHitPoints();
    }
    collidedSegment.hitPoints -= 1;
    
    if (collidedSegment.hitPoints <= 0) {
      // 騎士死亡，應用死亡加成
      const deathBonus = getKnightDeathBonus();
      if (deathBonus > 0) {
        // 在騎士位置後添加新隊員
        for (let i = 0; i < deathBonus; i++) {
          const randomRole = SEGMENT_TYPES[Math.floor(Math.random() * SEGMENT_TYPES.length)];
          snake.push({
            x: collidedSegment.x,
            y: collidedSegment.y,
            renderX: collidedSegment.renderX,
            renderY: collidedSegment.renderY,
            role: randomRole,
            lastShot: 0,
            borderColor: getCurrentPlayerColor(),
            facing: collidedSegment.facing || facing,
          });
        }
        scoreValue.textContent = snake.length;
        if (snake.length > maxLengthThisRun) {
          maxLengthThisRun = snake.length;
        }
      }
      
      removeSet.add(collidedIndex);
      spawnExplosion(
        collidedRect.x + collidedRect.size / 2,
        collidedRect.y + collidedRect.size / 2
      );
      healLeader(LEADER_HEAL_ON_KILL, enemy.x, enemy.y);
      return "kill";
    }
    // 騎士還活著，但受到傷害
    return "survive";
  }

  // 尋找其他騎士來保護
  const knightIndex = findKnightIndex(removeSet);
  if (knightIndex !== -1) {
    const knight = snake[knightIndex];
    // 處理騎士可被攻擊次數
    if (!knight.hitPoints) {
      knight.hitPoints = getKnightHitPoints();
    }
    knight.hitPoints -= 1;
    
    if (knight.hitPoints <= 0) {
      // 騎士死亡，應用死亡加成
      const deathBonus = getKnightDeathBonus();
      if (deathBonus > 0) {
        for (let i = 0; i < deathBonus; i++) {
          const randomRole = SEGMENT_TYPES[Math.floor(Math.random() * SEGMENT_TYPES.length)];
          snake.push({
            x: knight.x,
            y: knight.y,
            renderX: knight.renderX,
            renderY: knight.renderY,
            role: randomRole,
            lastShot: 0,
            borderColor: getCurrentPlayerColor(),
            facing: knight.facing || facing,
          });
        }
        scoreValue.textContent = snake.length;
        if (snake.length > maxLengthThisRun) {
          maxLengthThisRun = snake.length;
        }
      }
      
      removeSet.add(knightIndex);
      spawnExplosion(
        knight.x * GRID_SIZE + GRID_SIZE / 2,
        knight.y * GRID_SIZE + GRID_SIZE / 2
      );
      healLeader(LEADER_HEAL_ON_KILL, enemy.x, enemy.y);
      return "kill";
    }
    // 騎士還活著，但受到傷害
    return "survive";
  }

  removeSet.add(collidedIndex);
  return "survive";
}

function findKnightIndex(removeSet) {
  for (let i = 1; i < snake.length; i++) {
    if (removeSet.has(i)) continue;
    if (snake[i].role === "knight") {
      return i;
    }
  }
  return -1;
}

function spawnExplosion(x, y) {
  effects.push({
    type: "explosion",
    x,
    y,
    radius: GRID_SIZE,
    alpha: 0.6,
    fade: 0.02,
  });
}

function damageEnemy(enemy, amount) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.hitTimer = 8;
  enemy.hpTextTimer = 40;
  effects.push({
    type: "hit",
    x: enemy.x,
    y: enemy.y,
    radius: GRID_SIZE * 0.45,
    alpha: 0.7,
    fade: 0.05,
  });
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    registerKill(enemy.x, enemy.y, enemy.tier || 1);
    effects.push({
      type: "death",
      x: enemy.x,
      y: enemy.y,
      radius: GRID_SIZE * 0.6,
      alpha: 0.9,
      fade: 0.025,
    });
    healLeader(LEADER_HEAL_ON_KILL, enemy.x, enemy.y);
  }
}

function damageLeader(amount, sourceX, sourceY, enemy = null) {
  if (isGameOver) return;
  // 如果正在選擇升級，鎖血，不扣血也不觸發死亡
  if (isChoosingUpgrade) return;
  // 如果敵人存在，使用敵人的傷害值
  const actualDamage = enemy && enemy.damage ? enemy.damage : amount;
  leaderHP = Math.max(0, leaderHP - actualDamage);
  const hitX = sourceX ?? snake[0].x * GRID_SIZE + GRID_SIZE / 2;
  const hitY = sourceY ?? snake[0].y * GRID_SIZE + GRID_SIZE / 2;
  effects.push({
    type: "leader-hit",
    x: hitX,
    y: hitY,
    radius: GRID_SIZE * 0.7,
    alpha: 0.7,
    fade: 0.04,
  });
  if (leaderHP <= 0) {
    triggerGameOver();
  }
}

function healLeader(amount, sourceX, sourceY) {
  if (isGameOver) return;
  const prev = leaderHP;
  // 計算升級後的最大血量
  const maxHp = getLeaderMaxHp();
  leaderHP = Math.min(maxHp, leaderHP + amount);
  if (leaderHP > prev) {
    effects.push({
      type: "heal",
      x: sourceX ?? snake[0].x * GRID_SIZE + GRID_SIZE / 2,
      y: sourceY ?? snake[0].y * GRID_SIZE + GRID_SIZE / 2,
      radius: GRID_SIZE * 0.5,
      alpha: 0.6,
      fade: 0.03,
    });
  }
}

function getHealthColor(ratio) {
  const clamp = Math.min(1, Math.max(0, ratio));
  const start = { r: 34, g: 197, b: 94 }; // 綠色
  const end = { r: 239, g: 68, b: 68 }; // 紅色
  const r = Math.round(end.r + (start.r - end.r) * clamp);
  const g = Math.round(end.g + (start.g - end.g) * clamp);
  const b = Math.round(end.b + (start.b - end.b) * clamp);
  return `rgb(${r},${g},${b})`;
}

function registerKill(x, y, enemyTier = 1) {
  killCount += 1;
  killValue.textContent = killCount;
  effects.push({
    type: "kill",
    x: x ?? snake[0].x * GRID_SIZE + GRID_SIZE / 2,
    y: y ?? snake[0].y * GRID_SIZE + GRID_SIZE / 2,
    radius: GRID_SIZE * 0.4,
    alpha: 0.6,
    fade: 0.03,
  });
  
  // 獲得經驗值
  if (window.UPGRADE_CONFIG && window.UPGRADE_CONFIG.enemyLevel) {
    const config = window.UPGRADE_CONFIG.enemyLevel;
    const exp = config.baseExp * enemyTier; // enemyTier 就是等級
    addExp(exp);
  } else {
    // 降級處理：如果沒有配置，使用預設值
    addExp(10 * enemyTier);
  }
}

// 添加經驗值
function addExp(amount) {
  if (isChoosingUpgrade) return; // 選擇升級時暫停獲得經驗值
  playerExp += amount;
  checkLevelUp();
  updateLevelUI();
}

// 檢查是否升級
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
    // 遞迴檢查是否還能再升級
    checkLevelUp();
  }
}

// 更新等級 UI
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

// 顯示升級選擇
// 生成三個升級選項（同職業只出現一個），暫停遊戲邏輯，鎖血
function showUpgradeSelection() {
  if (!window.UPGRADE_CONFIG || !upgradeOverlay || !upgradeOptions) return;
  
  // 如果血量為 0 或以下，先恢復到 1，避免在升級時死亡
  if (leaderHP <= 0) {
    leaderHP = 1;
  }
  
  // 鎖血：選擇升級時不會受到傷害
  isChoosingUpgrade = true;
  upgradeOverlay.classList.remove("hidden");
  
  // 生成三個選項
  const options = generateUpgradeOptions();
  upgradeOptions.innerHTML = "";
  
  options.forEach((option, index) => {
    const optionElement = createUpgradeOptionElement(option, index);
    upgradeOptions.appendChild(optionElement);
  });
}

// 生成升級選項（三選一，同職業只出現一個）
function generateUpgradeOptions() {
  if (!window.UPGRADE_CONFIG) return [];
  
  const config = window.UPGRADE_CONFIG.upgrades;
  const availableOptions = [];
  
  // 收集所有可用的升級選項
  Object.keys(config).forEach(role => {
    Object.keys(config[role]).forEach(upgradeKey => {
      const upgrade = config[role][upgradeKey];
      const currentLevel = upgradeLevels[role][upgradeKey];
      
      if (currentLevel < upgrade.maxLevel) {
        availableOptions.push({
          role,
          key: upgradeKey,
          upgrade,
          currentLevel,
        });
      }
    });
  });
  
  // 如果所有選項都滿級，返回滿級選項
  if (availableOptions.length === 0) {
    return [{
      role: "leader",
      key: "maxHp",
      upgrade: { name: "最大血量", description: "隊長最大血量 +1", icon: "leader.png" },
      currentLevel: -1, // -1 表示滿級
      isMaxed: true,
    }];
  }
  
  // 按職業分組
  const byRole = {};
  availableOptions.forEach(opt => {
    if (!byRole[opt.role]) byRole[opt.role] = [];
    byRole[opt.role].push(opt);
  });
  
  // 從每個職業中隨機選擇一個，然後再隨機選三個
  const selectedByRole = {};
  Object.keys(byRole).forEach(role => {
    const roleOptions = byRole[role];
    selectedByRole[role] = roleOptions[Math.floor(Math.random() * roleOptions.length)];
  });
  
  const allSelected = Object.values(selectedByRole);
  
  // 如果選項少於3個，直接返回
  if (allSelected.length <= 3) {
    return allSelected.slice(0, 3);
  }
  
  // 隨機選擇3個
  const result = [];
  const used = new Set();
  while (result.length < 3 && result.length < allSelected.length) {
    const randomIndex = Math.floor(Math.random() * allSelected.length);
    if (!used.has(randomIndex)) {
      used.add(randomIndex);
      result.push(allSelected[randomIndex]);
    }
  }
  
  return result;
}

// 創建升級選項元素
function createUpgradeOptionElement(option, index) {
  const div = document.createElement("div");
  div.className = `upgrade-option ${option.isMaxed ? "maxed" : ""}`;
  
  const icon = document.createElement("img");
  icon.className = "upgrade-option-icon";
  icon.src = option.upgrade.icon || "leader.png";
  icon.alt = option.upgrade.name;
  
  const name = document.createElement("div");
  name.className = "upgrade-option-name";
  name.textContent = option.upgrade.name;
  
  const description = document.createElement("div");
  description.className = "upgrade-option-description";
  let descText = option.upgrade.description.replace("{value}", option.upgrade.increment || 1);
  description.textContent = descText;
  
  const level = document.createElement("div");
  level.className = "upgrade-option-level";
  if (option.isMaxed) {
    level.textContent = "已滿級（效果：隊長最大HP+1）";
  } else {
    level.textContent = `Lv ${option.currentLevel + 1} / ${option.upgrade.maxLevel}`;
  }
  
  div.appendChild(icon);
  div.appendChild(name);
  div.appendChild(description);
  div.appendChild(level);
  
  if (!option.isMaxed) {
    div.addEventListener("click", () => {
      selectUpgrade(option);
    });
  }
  
  return div;
}

// 選擇升級
function selectUpgrade(option) {
  if (option.isMaxed) return;
  
  // 應用升級
  upgradeLevels[option.role][option.key] += 1;
  
  // 如果是滿級後的統一效果
  if (option.currentLevel + 1 >= option.upgrade.maxLevel) {
    // 檢查是否所有選項都滿級
    const allMaxed = checkAllUpgradesMaxed();
    if (allMaxed && window.UPGRADE_CONFIG.maxedOutBonus) {
      const currentMaxHp = LEADER_MAX_HP + (upgradeLevels.leader.maxHp * window.UPGRADE_CONFIG.upgrades.leader.maxHp.increment);
      leaderHP = Math.min(leaderHP + window.UPGRADE_CONFIG.maxedOutBonus.hpIncrease, currentMaxHp);
    }
  }
  
  // 關閉升級選擇
  upgradeOverlay.classList.add("hidden");
  isChoosingUpgrade = false;
  
  // 更新 UI（例如血量上限顯示）
  updateLevelUI();
}

// 檢查所有升級是否都滿級
function checkAllUpgradesMaxed() {
  if (!window.UPGRADE_CONFIG) return false;
  const config = window.UPGRADE_CONFIG.upgrades;
  
  for (const role of Object.keys(config)) {
    for (const upgradeKey of Object.keys(config[role])) {
      const upgrade = config[role][upgradeKey];
      const currentLevel = upgradeLevels[role][upgradeKey];
      if (currentLevel < upgrade.maxLevel) {
        return false;
      }
    }
  }
  return true;
}

// 獲取升級後的數值
function getUpgradedValue(role, key, baseValue) {
  if (!window.UPGRADE_CONFIG) return baseValue;
  const upgrade = window.UPGRADE_CONFIG.upgrades[role]?.[key];
  if (!upgrade) return baseValue;
  const level = upgradeLevels[role][key] || 0;
  return baseValue + (level * upgrade.increment);
}

// 獲取隊長最大血量
function getLeaderMaxHp() {
  return getUpgradedValue("leader", "maxHp", LEADER_MAX_HP);
}

// 獲取法師光環範圍
function getMageAuraRadius() {
  return getUpgradedValue("mage", "auraRange", AURA_RADIUS);
}

// 獲取法師光環傷害
function getMageAuraDamage() {
  return getUpgradedValue("mage", "auraDamage", AURA_DAMAGE);
}

// 獲取弓箭手箭矢速度
function getArcherArrowSpeed() {
  return getUpgradedValue("archer", "arrowSpeed", PROJECTILE_SPEED);
}

// 獲取弓箭手箭矢數量
function getArcherArrowCount() {
  return getUpgradedValue("archer", "arrowCount", 1);
}

// 獲取弓箭手射擊冷卻時間（升級後會減少冷卻時間，提高射擊頻率）
function getArcherCooldown() {
  if (!window.UPGRADE_CONFIG) return ARCHER_COOLDOWN;
  
  const config = window.UPGRADE_CONFIG.upgrades?.archer?.arrowSpeed;
  if (!config) return ARCHER_COOLDOWN;
  
  const currentLevel = upgradeLevels.archer.arrowSpeed || 0;
  
  // 每級減少 10% 冷卻時間（最多減少到 50%，即冷卻時間減半）
  // 公式：cooldown = baseCooldown * (1 - level * 0.1)，最小為 baseCooldown * 0.5
  const reduction = Math.min(currentLevel * 0.1, 0.5);
  const newCooldown = ARCHER_COOLDOWN * (1 - reduction);
  
  return Math.max(newCooldown, ARCHER_COOLDOWN * 0.5); // 最少減少到 50%
}

// 獲取騎士可被攻擊次數
function getKnightHitPoints() {
  return getUpgradedValue("knight", "hitPoints", 1);
}

// 獲取騎士死亡加成
function getKnightDeathBonus() {
  return getUpgradedValue("knight", "deathBonus", 0);
}

function drawHealthBar(x, y, width, height, current, max) {
  const ratio = max > 0 ? current / max : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = getHealthColor(clampedRatio);
  ctx.fillRect(x, y, width * clampedRatio, height);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

function gridToPixel(segment) {
  return {
    x: segment.x * GRID_SIZE + GRID_SIZE / 2,
    y: segment.y * GRID_SIZE + GRID_SIZE / 2,
  };
}

function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

function rectCircleCollide(rect, circle) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.size));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.size));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < (GRID_SIZE / 2) ** 2;
}

async function triggerGameOver() {
  if (isGameOver) return;
  // 如果正在選擇升級，不觸發遊戲結束（升級時鎖血）
  if (isChoosingUpgrade) return;
  isGameOver = true;
  maxLengthValue.textContent = maxLengthThisRun;
  finalKillValue.textContent = killCount;
  if (maxLevelValue) {
    maxLevelValue.textContent = maxLevelThisRun;
  }
  resetUploadForm();
  // 先更新排行榜，然後判斷是否進入前10名
  await updateLeaderboard();
  checkIfInLeaderboard();
  overlay.classList.remove("hidden");
}

// 判斷是否進入前10名
function checkIfInLeaderboard() {
  if (!uploadScoreBtn) return;
  
  // 如果一個敵人都沒殺，不顯示上傳按鈕
  if (killCount === 0) {
    uploadScoreBtn.style.display = "none";
    return;
  }
  
  // 檢查今日排行榜：如果今日排行榜沒有記錄或記錄少於10筆，顯示上傳按鈕
  if (todayLeaderboardData.length === 0 || todayLeaderboardData.length < 10) {
    uploadScoreBtn.style.display = "block";
    return;
  }
  
  // 檢查今日排行榜：如果當前擊殺數大於等於今日排行榜第10名的擊殺數，顯示上傳按鈕
  const todayMinKills = todayLeaderboardData[todayLeaderboardData.length - 1]?.kills ?? 0;
  if (killCount >= todayMinKills) {
    uploadScoreBtn.style.display = "block";
    return;
  }
  
  // 檢查全球排行榜：如果全球排行榜數據不足10筆，顯示上傳按鈕
  if (leaderboardData.length < 10) {
    uploadScoreBtn.style.display = "block";
    return;
  }
  
  // 檢查全球排行榜：如果當前擊殺數大於等於全球排行榜第10名的擊殺數，顯示上傳按鈕
  const globalMinKills = leaderboardData[leaderboardData.length - 1]?.kills ?? 0;
  if (killCount >= globalMinKills) {
    uploadScoreBtn.style.display = "block";
  } else {
    uploadScoreBtn.style.display = "none";
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 繪製邊界線，讓玩家清楚看到遊戲區域的邊界
  // 邊界線應該對應最後一格的邊界，而不是 gridWidth * GRID_SIZE
  // 有效的網格座標是 0 到 gridWidth-1，所以最後一格的右邊界在 (gridWidth-1) * GRID_SIZE + GRID_SIZE
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  // 邊界線應該從 (0,0) 開始，到最後一格的邊界結束
  const boundaryX = (gridWidth - 1) * GRID_SIZE + GRID_SIZE;
  const boundaryY = (gridHeight - 1) * GRID_SIZE + GRID_SIZE;
  ctx.strokeRect(0, 0, boundaryX, boundaryY);
  ctx.setLineDash([]);

  if (item) {
    const x = item.x * GRID_SIZE;
    const y = item.y * GRID_SIZE;
    ASSETS.item.draw(x, y, GRID_SIZE);
  }

  // 繪製所有角色（從後往前，確保前面的角色覆蓋後面的）
  // 繪製順序：後面的角色先繪製，前面的角色後繪製（在上層）
  // 這樣 leader 和前面的隊員會顯示在後面的隊員之上
  for (let i = snake.length - 1; i >= 0; i--) {
    const segment = snake[i];
    const index = i;
    // 使用插值後的視覺位置
    const renderX = (segment.renderX !== undefined ? segment.renderX : segment.x) * GRID_SIZE;
    const renderY = (segment.renderY !== undefined ? segment.renderY : segment.y) * GRID_SIZE;
    const x = renderX;
    const y = renderY;
    
    // 計算騎士透明度（根據剩餘 hitPoints）
    let alpha = 1;
    if (segment.role === "knight" && segment.hitPoints !== undefined) {
      const maxHitPoints = getKnightHitPoints();
      if (maxHitPoints > 0) {
        alpha = Math.max(0.3, segment.hitPoints / maxHitPoints);
      }
    }
    
    ctx.save();
    if (alpha < 1) {
      ctx.globalAlpha = alpha;
    }
    
    if (index === 0) {
      // 隊長使用當前的 facing
      ASSETS.leader.draw(x, y, GRID_SIZE, facing);
    } else if (segment.role && ASSETS[segment.role]) {
      // 其他勇者根據自己的左右位移決定面向
      // facing 已經在 moveSnake 中根據自己的位移更新了
      // 如果沒有 facing（上下移動），使用 leader 的 facing 作為預設值
      const segmentFacing = segment.facing !== undefined ? segment.facing : facing;
      ASSETS[segment.role].draw(x, y, GRID_SIZE, segmentFacing);
    } else {
      drawFallbackBlock("#64748b", () => {}, x, y, GRID_SIZE);
    }
    
    ctx.restore();
    
    // 繪製法師光環（在邊框之前，使用升級後的範圍）
    if (segment.role === "mage") {
      const auraRadius = getMageAuraRadius();
      ctx.strokeStyle = "rgba(59,130,246,0.2)";
      ctx.beginPath();
      ctx.arc(x + GRID_SIZE / 2, y + GRID_SIZE / 2, auraRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 繪製隨機顏色邊框（最後繪製，確保在最上層，邊框不透明）
    if (segment.borderColor) {
      ctx.strokeStyle = segment.borderColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    }
  }
  
  // 最後繪製所有血條，確保血條顯示在最上層，不會被任何角色遮住
  snake.forEach((segment, index) => {
    const renderX = (segment.renderX !== undefined ? segment.renderX : segment.x) * GRID_SIZE;
    const renderY = (segment.renderY !== undefined ? segment.renderY : segment.y) * GRID_SIZE;
    const x = renderX;
    const y = renderY;
    if (index === 0) {
      // 隊長血條
      const maxHp = getLeaderMaxHp();
      if (leaderHP < maxHp) {
        drawHealthBar(
          x,
          y - 8,
          GRID_SIZE,
          4,
          leaderHP,
          maxHp
        );
      }
    }
    // 其他勇者目前沒有血條，如果未來需要可以在此添加
  });

  enemies.forEach((enemy) => {
    if (enemy.hitTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, GRID_SIZE * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ASSETS.enemy.draw(
      enemy.x - GRID_SIZE / 2,
      enemy.y - GRID_SIZE / 2,
      GRID_SIZE
    );
    
    // 繪製怪物等級（在圖片下方）
    const enemyLevel = enemy.level || enemy.tier || 1;
    if (enemyLevel) {
      ctx.save();
      const levelText = `Lv${enemyLevel}`;
      
      // 繪製等級文字（白色，在圖片下方）
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        levelText,
        enemy.x,
        enemy.y + GRID_SIZE / 2 + 2
      );
      ctx.restore();
    }
    
    // 血條：只在受傷時顯示
    if ((enemy.maxHp || ENEMY_HP) > 0 && enemy.hp < (enemy.maxHp || ENEMY_HP)) {
      drawHealthBar(
        enemy.x - GRID_SIZE / 2,
        enemy.y - GRID_SIZE * 0.75,
        GRID_SIZE,
        3,
        enemy.hp,
        enemy.maxHp || ENEMY_HP
      );
    }
    
    // 血量文字：只在扣血時顯示（hpTextTimer > 0）
    if (enemy.hpTextTimer > 0) {
      ctx.save();
      ctx.fillStyle = "#fbbf24";
      ctx.font = "14px 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        `HP ${Math.max(0, Math.ceil(enemy.hp))}`,
        enemy.x,
        enemy.y - GRID_SIZE * 0.6
      );
      ctx.restore();
    }
  });

  projectiles.forEach((proj) => {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    ctx.lineTo(proj.x - proj.vx * 2, proj.y - proj.vy * 2);
    ctx.stroke();
  });

  effects.forEach((effect) => {
    ctx.save();
    ctx.globalAlpha = effect.alpha;
    if (effect.type === "aura") {
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.type === "explosion") {
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.type === "hit") {
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect.type === "death") {
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(effect.x - effect.radius, effect.y);
      ctx.lineTo(effect.x + effect.radius, effect.y);
      ctx.moveTo(effect.x, effect.y - effect.radius);
      ctx.lineTo(effect.x, effect.y + effect.radius);
      ctx.stroke();
    } else if (effect.type === "leader-hit") {
      ctx.fillStyle = "rgba(248,113,113,0.45)";
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect.type === "heal") {
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.type === "kill") {
      ctx.fillStyle = "rgba(250,204,21,0.6)";
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    effect.alpha -= effect.fade ?? 0.01;
  });
  effects = effects.filter((e) => e.alpha > 0);
}

function gameLoop(timestamp) {
  if (isGameOver) {
    cancelAnimationFrame(animationId);
    return;
  }
  
  // 如果遊戲暫停或正在倒數計時，只繪製畫面，不更新邏輯
  if (isPaused || isCountdown) {
    draw();
    animationId = requestAnimationFrame(gameLoop);
    return;
  }
  
  // 如果正在選擇升級，暫停遊戲邏輯，但繼續繪製
  if (isChoosingUpgrade) {
    draw();
    animationId = requestAnimationFrame(gameLoop);
    return;
  }
  
  if (!lastMoveTime) lastMoveTime = timestamp;
  if (!lastEnemySpawn) lastEnemySpawn = timestamp;

  if (timestamp - lastMoveTime >= GAME_SPEED) {
    moveSnake(timestamp);
    lastMoveTime = timestamp;
  }

  // 平滑插值：更新視覺位置（每一幀都執行，讓移動更平滑）
  const timeSinceMove = timestamp - lastMoveTime;
  const moveProgress = Math.min(timeSinceMove / GAME_SPEED, 1);
  
  snake.forEach((segment) => {
    // 初始化視覺位置
    if (segment.renderX === undefined) {
      segment.renderX = segment.x;
      segment.renderY = segment.y;
    }
    
    // 計算目標位置（像素座標）
    const targetX = segment.x;
    const targetY = segment.y;
    const currentRenderX = segment.renderX;
    const currentRenderY = segment.renderY;
    
    // 計算差值
    const diffX = targetX - currentRenderX;
    const diffY = targetY - currentRenderY;
    
    // 如果已經到達目標位置，直接設置
    if (Math.abs(diffX) < 0.001 && Math.abs(diffY) < 0.001) {
      segment.renderX = targetX;
      segment.renderY = targetY;
    } else {
      // 使用線性插值，根據時間進度平滑移動
      // 使用更平滑的插值速度（每幀移動更多，讓移動更流暢）
      const lerpSpeed = 0.15; // 調整這個值可以改變平滑度（0.1-0.3 之間較好）
      segment.renderX = currentRenderX + diffX * lerpSpeed;
      segment.renderY = currentRenderY + diffY * lerpSpeed;
    }
  });
  
  // ========== 邊界檢測 ==========
  // 基於視覺位置來判斷（確保玩家看到的和實際判定一致）
  // 邏輯位置可以暫時超出邊界，但只有在視覺位置真的超出邊界時才判定死亡
  // 避免因平滑移動（lerp）延遲導致的誤判
  // 只在檢查隊長（頭部）的視覺位置
  if (snake.length > 0 && !isGameOver) {
    const head = snake[0];
    const renderX = head.renderX !== undefined ? head.renderX : head.x;
    const renderY = head.renderY !== undefined ? head.renderY : head.y;
    
    // 計算視覺位置對應的像素座標
    const pixelX = renderX * GRID_SIZE;
    const pixelY = renderY * GRID_SIZE;
    
    // 計算邊界像素座標（對應實際繪製的邊界線）
    const boundaryLeft = 0;
    const boundaryTop = 0;
    const boundaryRight = (gridWidth - 1) * GRID_SIZE + GRID_SIZE;
    const boundaryBottom = (gridHeight - 1) * GRID_SIZE + GRID_SIZE;
    
    // 檢查視覺位置是否超出邊界
    // 使用角色中心點來判斷，所以需要考慮角色大小（GRID_SIZE）
    const halfSize = GRID_SIZE / 2;
    if (pixelX + halfSize < boundaryLeft || 
        pixelY + halfSize < boundaryTop || 
        pixelX + halfSize > boundaryRight || 
        pixelY + halfSize > boundaryBottom) {
      // 視覺位置真的超出邊界，判定死亡
      triggerGameOver();
      return; // 立即返回，避免繼續執行
    }
  }

  if (timestamp - lastEnemySpawn >= ENEMY_SPAWN_RATE) {
    spawnEnemy();
    lastEnemySpawn = timestamp;
  }

  handleArcherAttacks(timestamp);
  handleMageAura();
  updateProjectiles();
  updateEnemies();
  handleEnemyCollisions();
  draw();

  animationId = requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  // 如果遊戲暫停或正在選擇升級，不處理方向鍵
  if (isPaused || isChoosingUpgrade || isGameOver) return;
  
  const map = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
  };
  const dir = map[event.key];
  if (!dir) return;
  if (dir.x === -direction.x && dir.y === -direction.y) return;
  nextDirection = dir;
});

// ========== 觸控手勢支持 ==========
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

canvas?.addEventListener("touchstart", (event) => {
  if (isPaused || isChoosingUpgrade || isGameOver) return;
  event.preventDefault();
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
}, { passive: false });

canvas?.addEventListener("touchend", (event) => {
  if (isPaused || isChoosingUpgrade || isGameOver) return;
  event.preventDefault();
  const touch = event.changedTouches[0];
  const touchEndX = touch.clientX;
  const touchEndY = touch.clientY;
  const touchEndTime = Date.now();
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const deltaTime = touchEndTime - touchStartTime;
  
  // 如果觸控時間太長（超過 500ms）或移動距離太小，忽略
  if (deltaTime > 500 || (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20)) {
    return;
  }
  
  // 判斷主要移動方向
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 水平移動
    if (deltaX > 0) {
      // 向右
      const dir = { x: 1, y: 0 };
      if (dir.x !== -direction.x || dir.y !== -direction.y) {
        nextDirection = dir;
      }
    } else {
      // 向左
      const dir = { x: -1, y: 0 };
      if (dir.x !== -direction.x || dir.y !== -direction.y) {
        nextDirection = dir;
      }
    }
  } else {
    // 垂直移動
    if (deltaY > 0) {
      // 向下
      const dir = { x: 0, y: 1 };
      if (dir.x !== -direction.x || dir.y !== -direction.y) {
        nextDirection = dir;
      }
    } else {
      // 向上
      const dir = { x: 0, y: -1 };
      if (dir.x !== -direction.x || dir.y !== -direction.y) {
        nextDirection = dir;
      }
    }
  }
}, { passive: false });

// ========== Modal 控制函數 ==========
function showModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
  isPaused = true;
}

function hideModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  // 只有在沒有其他 Modal 顯示時才開始倒數計時
  if (!leaderboardModal?.classList.contains("hidden") || 
      !guideModal?.classList.contains("hidden") || 
      !pauseModal?.classList.contains("hidden")) {
    return;
  }
  // 開始倒數計時
  startCountdown();
}

// ========== 倒數計時功能 ==========
function startCountdown() {
  if (isCountdown || isGameOver || isChoosingUpgrade) return;
  
  isCountdown = true;
  let count = 3;
  
  // 顯示倒數計時
  if (countdownOverlay) {
    countdownOverlay.classList.remove("hidden");
  }
  
  // 更新倒數數字
  function updateCountdown() {
    if (!countdownNumber) return;
    
    if (count > 0) {
      countdownNumber.textContent = count;
      count--;
      // 添加動畫效果
      countdownNumber.style.animation = "none";
      setTimeout(() => {
        if (countdownNumber) {
          countdownNumber.style.animation = "countdownPulse 0.5s ease-out";
        }
      }, 10);
      setTimeout(updateCountdown, 1000);
    } else {
      // 倒數完成，隱藏倒數計時並取消暫停
      if (countdownOverlay) {
        countdownOverlay.classList.add("hidden");
      }
      isPaused = false;
      isCountdown = false;
    }
  }
  
  // 開始倒數
  updateCountdown();
}

function showLeaderboard() {
  showModal(leaderboardModal);
  updateLeaderboard();
}

function showGuide() {
  showModal(guideModal);
}

function showPause() {
  showModal(pauseModal);
}

function hidePause() {
  hideModal(pauseModal);
}

function goToHome() {
  // 取消動畫
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  // 隱藏所有 Modal 和 Overlay
  if (overlay) overlay.classList.add("hidden");
  if (leaderboardModal) leaderboardModal.classList.add("hidden");
  if (guideModal) guideModal.classList.add("hidden");
  if (pauseModal) pauseModal.classList.add("hidden");
  if (upgradeOverlay) upgradeOverlay.classList.add("hidden");
  
  // 切換到主選單
  if (gameScreen) gameScreen.classList.add("hidden");
  if (homeScreen) homeScreen.classList.remove("hidden");
  
  // 重置狀態
  isPaused = false;
  isGameOver = false;
  isCountdown = false;
  
  // 隱藏倒數計時
  if (countdownOverlay) {
    countdownOverlay.classList.add("hidden");
  }
}

// ========== 事件監聽器 ==========
// 主選單按鈕
if (homeStartBtn) {
  homeStartBtn.addEventListener("click", () => {
    const name = homePlayerNameInput ? homePlayerNameInput.value.trim() : "";
    if (!name) {
      alert("請先輸入你的勇者名！");
      if (homePlayerNameInput) {
        homePlayerNameInput.focus();
      }
      return;
    }
    // 保存名字
    localStorage.setItem("playerName", name);
    // 開始遊戲
    if (assetsReady) {
      startGame();
    }
  });
}

if (homePlayerNameInput) {
  homePlayerNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      homeStartBtn?.click();
    }
  });
}

if (homeLeaderboardBtn) {
  homeLeaderboardBtn.addEventListener("click", showLeaderboard);
}

if (homeGuideBtn) {
  homeGuideBtn.addEventListener("click", showGuide);
}

// 遊戲中快捷按鈕
if (pauseBtn) {
  pauseBtn.addEventListener("click", showPause);
}

if (leaderboardBtn) {
  leaderboardBtn.addEventListener("click", showLeaderboard);
}

if (guideBtn) {
  guideBtn.addEventListener("click", showGuide);
}

// Modal 關閉按鈕
if (leaderboardCloseBtn) {
  leaderboardCloseBtn.addEventListener("click", () => hideModal(leaderboardModal));
}

if (guideCloseBtn) {
  guideCloseBtn.addEventListener("click", () => hideModal(guideModal));
}

if (pauseCloseBtn) {
  pauseCloseBtn.addEventListener("click", hidePause);
}

if (pauseResumeBtn) {
  pauseResumeBtn.addEventListener("click", hidePause);
}

if (pauseHomeBtn) {
  pauseHomeBtn.addEventListener("click", goToHome);
}

// Game Over 按鈕
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    if (!assetsReady) return;
    overlay.classList.add("hidden");
    hasUploadedThisRun = false;
    startGame();
  });
}

if (homeBtn) {
  homeBtn.addEventListener("click", goToHome);
}

uploadScoreBtn?.addEventListener("click", handleScoreUpload);
playerNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleScoreUpload();
  }
});

updateLoaderProgress();
if (TOTAL_ASSETS === 0) {
  finishLoadingPhase();
}

function resetUploadForm() {
  if (!playerNameInput || !uploadScoreBtn || !uploadStatus) return;
  if (!hasUploadedThisRun) {
    // 從 localStorage 讀取保存的名字，如果沒有則為空
    const savedName = localStorage.getItem("playerName") || "";
    playerNameInput.value = savedName;
    // 初始狀態隱藏上傳按鈕，等待 checkIfInLeaderboard 判斷
    uploadScoreBtn.style.display = "none";
  }
  uploadScoreBtn.disabled = hasUploadedThisRun;
  uploadStatus.textContent = hasUploadedThisRun ? "已上傳至排行榜！" : "";
  uploadStatus.className = hasUploadedThisRun
    ? "upload-status success"
    : "upload-status";
}

async function handleScoreUpload() {
  if (
    !playerNameInput ||
    !uploadScoreBtn ||
    !uploadStatus ||
    hasUploadedThisRun
  ) {
    return;
  }
  // 優先使用輸入框的值，如果為空則使用保存的名字
  let name = playerNameInput.value.trim();
  if (!name) {
    name = localStorage.getItem("playerName") || "";
  }
  if (!name) {
    uploadStatus.textContent = "請先輸入名字。";
    uploadStatus.className = "upload-status error";
    return;
  }
  if (isUploading) return;
  isUploading = true;
  uploadScoreBtn.disabled = true;
  uploadStatus.textContent = "上傳中...";
  uploadStatus.className = "upload-status";
  try {
    await window.firebaseAddDoc(window.firebaseLeaderboardRef, {
      name,
      score: maxLengthThisRun,
      kills: killCount,
      date: new Date().toISOString(),
    });
    hasUploadedThisRun = true;
    // 保存名字到 localStorage
    localStorage.setItem("playerName", name);
    uploadStatus.textContent = "已上傳至排行榜！";
    uploadStatus.className = "upload-status success";
    // 上傳成功後更新排行榜
    updateLeaderboard();
  } catch (error) {
    console.error("Failed to upload score", error);
    uploadStatus.textContent = "上傳失敗，請稍後再試。";
    uploadStatus.className = "upload-status error";
    uploadScoreBtn.disabled = false;
  } finally {
    isUploading = false;
  }
}

/**
 * 更新排行榜（一次性查詢，非即時同步）
 * 
 * 功能：
 * 1. 查詢所有記錄（按擊殺數排序）
 * 2. 客戶端過濾今日記錄（避免 Firebase 查詢錯誤）
 * 3. 更新全球排行榜和今日排行榜顯示（各顯示前 5 名）
 * 4. 儲存總排行榜前 10 名數據（用於判斷是否進入前 10 名）
 * 
 * 注意：使用客戶端過濾而非 Firebase where 查詢，因為
 * Firebase 不允許在使用 where 不等式過濾 date 的同時，用 orderBy 按 kills 排序
 */
async function updateLeaderboard() {
  if (!leaderboardListAll || !leaderboardListToday || !window.firebaseLeaderboardRef || !window.firebaseGetDocs) return;
  
  try {
    // 查詢所有記錄（按擊殺數排序）
    const leaderboardQuery = window.firebaseQuery(
      window.firebaseLeaderboardRef,
      window.firebaseOrderBy("kills", "desc"),
      window.firebaseLimit(100) // 查詢更多記錄以便過濾今日
    );
    
    const snapshot = await window.firebaseGetDocs(leaderboardQuery);
    
    // 處理所有記錄
    const allData = [];
    const todayData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const record = {
        name: data.name ?? "無名勇者",
        kills: data.kills ?? 0,
        score: data.score ?? 0,
        date: data.date,
      };
      
      allData.push(record);
      
      // 過濾今日記錄（客戶端過濾）
      if (data.date) {
        const recordDate = new Date(data.date);
        if (recordDate >= today && recordDate < tomorrow) {
          todayData.push(record);
        }
      }
    });
    
    // 儲存總排行榜數據（用於判斷是否進入前10名）
    leaderboardData = allData.slice(0, 10);
    // 儲存今日排行榜數據（用於判斷是否進入前10名）
    todayLeaderboardData = todayData.slice(0, 10);
    
    // 更新總排行榜顯示（前5名）
    renderLeaderboardList(leaderboardListAll, allData.slice(0, 5));
    
    // 更新今日排行榜顯示（前5名）
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

/**
 * 渲染排行榜列表
 * @param {HTMLElement} listElement - 排行榜列表元素
 * @param {Array} data - 排行榜數據陣列
 */
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

// 渲染快速指引面板（通用函數）
function renderGuidePanelContent(panelElement) {
  if (!panelElement || !window.GUIDE_CONFIG) {
    console.warn("Guide panel or config not found");
    return;
  }

  const config = window.GUIDE_CONFIG;
  
  let html = `<h2>${escapeHtml(config.title || "快速指引")}</h2>`;
  
  if (config.intro) {
    html += `<p>${escapeHtml(config.intro)}</p>`;
  }
  
  if (config.items && config.items.length > 0) {
    html += `<ul class="icon-list">`;
    config.items.forEach((item) => {
      html += `
        <li>
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt || "")}" />
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.description)}</p>
          </div>
        </li>
      `;
    });
    html += `</ul>`;
  }
  
  if (config.tip) {
    html += `<p class="tip">${escapeHtml(config.tip)}</p>`;
  }
  
  panelElement.innerHTML = html;
}

// 渲染快速指引面板
function renderGuidePanel() {
  if (guidePanel) {
    renderGuidePanelContent(guidePanel);
  }
}

// 頁面載入時渲染快速指引
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    renderGuidePanel();
    resizeCanvas();
  });
} else {
  renderGuidePanel();
  resizeCanvas();
}

