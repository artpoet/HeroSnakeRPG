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

// Camera 物件
const camera = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  
  // 更新 Camera 位置，使其跟隨目標 (targetX, targetY 是像素座標)
  update(targetX, targetY) {
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
  mage: { auraRange: 0, auraDamage: 0 },
  archer: { arrowCount: 0, arrowSpeed: 0 },
  knight: { hitPoints: 0, deathBonus: 0 },
  leader: { maxHp: 0, damage: 0 },
};

// 資源載入
let assetsLoaded = 0;
let assetsReady = false;
const assetDefinitions = {
  leader: { src: "leader.png", fallbackColor: "#ef4444", fallbackSymbol: "👑" },
  archer: { src: "archer.png", fallbackColor: "#22c55e", fallbackSymbol: "🏹" },
  mage: { src: "mage.png", fallbackColor: "#3b82f6", fallbackSymbol: "🔮" },
  knight: { src: "knight.png", fallbackColor: "#facc15", fallbackSymbol: "🛡️" },
  enemy: { src: "enemy.png", fallbackColor: "#efefef", fallbackSymbol: "💀" },
  item: { src: "item.png", fallbackColor: "#a855f7", fallbackSymbol: "🎁" },
};
const TOTAL_ASSETS = Object.keys(assetDefinitions).length;
const ASSETS = {};

// ========== 初始化與資源載入 ==========

function createAsset(key, def) {
  const img = new Image();
  img.src = def.src;
  
  const asset = {
    img: img,
    loaded: false,
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
    assetsLoaded++;
    updateLoader();
  };
  img.onerror = () => {
    asset.loaded = false; // Keep using fallback
    assetsLoaded++; // Still count as handled
    updateLoader();
  };
  
  return asset;
}

function updateLoader() {
  const percent = Math.floor((assetsLoaded / TOTAL_ASSETS) * 100);
  const loaderBar = document.getElementById("loaderBar");
  const loaderText = document.getElementById("loaderText");
  if (loaderBar) loaderBar.style.width = `${percent}%`;
  if (loaderText) loaderText.innerText = `載入資產中... ${percent}%`;

  if (assetsLoaded >= TOTAL_ASSETS) {
    finishLoading();
  }
}

function finishLoading() {
  assetsReady = true;
  const homeLoader = document.getElementById("homeLoader");
  const homeMenu = document.getElementById("homeMenu");
  if (homeLoader) homeLoader.classList.add("hidden");
  if (homeMenu) homeMenu.classList.remove("hidden");

  // Auto-fill name
  const savedName = localStorage.getItem("playerName");
  const input = document.getElementById("homePlayerNameInput");
  if (savedName && input) input.value = savedName;

  resizeCanvas();
}

// 初始化資產
for (const [key, def] of Object.entries(assetDefinitions)) {
  ASSETS[key] = createAsset(key, def);
}

// ========== 視窗大小與 Camera ==========

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
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
    mage: { auraRange: 0, auraDamage: 0 },
    archer: { arrowCount: 0, arrowSpeed: 0 },
    knight: { hitPoints: 0, deathBonus: 0 },
    leader: { maxHp: 0, damage: 0 },
  };
  leaderHP = getLeaderMaxHp();

  // 初始化時間戳記，確保第一次移動能立即執行
  lastMoveTime = 0;
  lastEnemySpawn = 0;
  
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
  return { x, y };
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
    return {
        hp: base.baseHp + (level - 1) * base.hpPerLevel,
        damage: base.baseDamage + (level - 1) * base.damagePerLevel,
        exp: base.baseExp * level
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
  
  // 重置 Render 位置為舊位置 (準備開始 Lerp)
  snake.forEach((s, i) => {
      s.renderX = prevPositions[i].x;
      s.renderY = prevPositions[i].y;
      s.targetRenderX = s.x;
      s.targetRenderY = s.y;
  });
  
  // 檢查道具（檢查所有道具）
  const collectedItemIndex = items.findIndex(it => it && head.x === it.x && head.y === it.y);
  if (collectedItemIndex !== -1) {
      handleItemCollection();
      // 移除收集的道具，生成新的
      items[collectedItemIndex] = spawnItem();
  }
}

function handleItemCollection() {
    // 隨機招募
    const types = ["archer", "mage", "knight"];
    const role = types[Math.floor(Math.random() * types.length)];
    const tail = snake[snake.length - 1];
    
    const newSegment = {
        x: tail.x, y: tail.y,
        renderX: tail.x, renderY: tail.y,
        targetRenderX: tail.x,
        targetRenderY: tail.y,
        role: role,
        facing: tail.facing,
        id: Date.now(),
        lastShot: 0
    };
    
    // 如果是騎士，初始化 hitPoints
    if (role === "knight") {
        newSegment.hitPoints = getKnightHitPoints();
    }
    
    snake.push(newSegment);
    
    // 不需要在這裡生成新道具，已在收集時處理
    scoreValue.innerText = snake.length;
    maxLengthThisRun = Math.max(maxLengthThisRun, snake.length);
    
    // 視覺特效
    effects.push({
        type: "text", text: "+1", 
        x: (tail.x * GRID_SIZE) + GRID_SIZE/2, 
        y: (tail.y * GRID_SIZE) + GRID_SIZE/2,
        life: 30, color: "#4ade80"
    });
}

// Game Loop
function gameLoop(timestamp) {
  if (isGameOver) return;
  
  if (isPaused || isCountdown || isChoosingUpgrade) {
      draw();
      requestAnimationFrame(gameLoop);
      return;
  }

  // 邏輯更新頻率控制
  if (!lastMoveTime) lastMoveTime = timestamp;
  if (timestamp - lastMoveTime >= GAME_SPEED) {
    moveSnake(timestamp);
    lastMoveTime = timestamp;
  }
  
  if (!lastEnemySpawn) lastEnemySpawn = timestamp;
  
  if (timestamp - lastEnemySpawn >= ENEMY_SPAWN_RATE) {
      spawnEnemy();
      lastEnemySpawn = timestamp;
  }
  
  // Lerp 平滑移動
  const t = Math.min((timestamp - lastMoveTime) / GAME_SPEED, 1);
  snake.forEach(s => {
      if (s.targetRenderX !== undefined) {
          s.renderX = s.renderX + (s.targetRenderX - s.renderX) * 0.2; // 簡單的 easing
          s.renderY = s.renderY + (s.targetRenderY - s.renderY) * 0.2;
          // 修正：非常接近時直接吸附
          if (Math.abs(s.renderX - s.targetRenderX) < 0.01) s.renderX = s.targetRenderX;
          if (Math.abs(s.renderY - s.targetRenderY) < 0.01) s.renderY = s.targetRenderY;
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
        
        const angle = Math.atan2(targetPixelY - e.y, targetPixelX - e.x);
        e.x += Math.cos(angle) * ENEMY_SPEED;
        e.y += Math.sin(angle) * ENEMY_SPEED;
        
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
            const dist = Math.hypot(sx - e.x, sy - e.y);
            if (dist < GRID_SIZE * 0.8) {
                // 碰撞發生
                e.lastCollisionTime = currentTime;
                collisionHandled = true; // 標記已處理，確保只處理一次
                
                if (s.role === "leader") {
                    // 領隊撞到敵人：領隊扣血，敵人也要扣血
                    // 領隊傷害：基礎 0，升級後每級 +1
                    const leaderDamage = getUpgradedValue("leader", "damage", 0);
                    if (leaderDamage > 0) {
                        damageEnemy(e, leaderDamage);
                    }
                    
                    // 領隊受傷：使用敵人的傷害值
                    const enemyDamage = e.damage || 35;
                    leaderHP = Math.max(0, leaderHP - enemyDamage);
                    if (leaderHP <= 0) {
                        triggerGameOver();
                        return;
                    }
                    
                    // 推開敵人
                    e.x -= Math.cos(angle) * 10;
                    e.y -= Math.sin(angle) * 10;
                    
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
                    for (let knightIdx = 0; knightIdx < snake.length && !knightFound; knightIdx++) {
                        if (knightIdx === index) continue; // 跳過被撞的隊員
                        
                        const knightSeg = snake[knightIdx];
                        if (knightSeg.role === "knight") {
                            knightFound = true;
                            
                            // 初始化或獲取騎士的 hitPoints
                            if (!knightSeg.hitPoints) {
                                knightSeg.hitPoints = getKnightHitPoints();
                            }
                            
                            // 減少騎士的 hitPoints
                            knightSeg.hitPoints--;
                            
                            // 如果騎士的 hitPoints 歸零，移除騎士
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
                                            lastShot: 0
                                        };
                                        // 如果是騎士，初始化 hitPoints
                                        if (newRole === "knight") {
                                            newSegment.hitPoints = getKnightHitPoints();
                                        }
                                        snake.push(newSegment);
                                    }
                                    scoreValue.textContent = snake.length;
                                }
                            }
                            break; // 只處理第一個找到的騎士
                        }
                    }
                    
                    if (!knightFound) {
                        // 沒有騎士，移除被撞的隊員
                        snake.splice(index, 1);
                        scoreValue.textContent = snake.length;
                    }
                }
            }
        }
    });
    
    // 移除死亡的敵人
    enemies = enemies.filter(e => e.hp > 0 && !e.dead);
}

function getKnightHitPoints() {
    return getUpgradedValue("knight", "hitPoints", 1);
}

function getUpgradedValue(role, key, baseValue) {
    if (!window.UPGRADE_CONFIG) return baseValue;
    const upgrade = window.UPGRADE_CONFIG.upgrades[role]?.[key];
    if (!upgrade) return baseValue;
    const level = upgradeLevels[role][key] || 0;
    return baseValue + (level * upgrade.increment);
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
    const availableOptions = [];
    
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
    
    if (availableOptions.length === 0) {
        return [{
            role: "leader",
            key: "maxHp",
            upgrade: { name: "最大血量", description: "隊長最大血量 +1", icon: "leader.png" },
            currentLevel: -1,
            isMaxed: true,
        }];
    }
    
    // 按職業分組
    const byRole = {};
    availableOptions.forEach(opt => {
        if (!byRole[opt.role]) byRole[opt.role] = [];
        byRole[opt.role].push(opt);
    });
    
    const roles = Object.keys(byRole);
    
    // 如果職業數量 <= 3，從每個職業中隨機選擇一個
    if (roles.length <= 3) {
        const result = [];
        roles.forEach(role => {
            const roleOptions = byRole[role];
            result.push(roleOptions[Math.floor(Math.random() * roleOptions.length)]);
        });
        return result;
    }
    
    // 如果職業數量 > 3，先隨機選擇 3 個不同的職業
    const selectedRoles = [];
    const usedRoles = new Set();
    while (selectedRoles.length < 3 && selectedRoles.length < roles.length) {
        const randomIndex = Math.floor(Math.random() * roles.length);
        const role = roles[randomIndex];
        if (!usedRoles.has(role)) {
            usedRoles.add(role);
            selectedRoles.push(role);
        }
    }
    
    // 從選中的職業中，每個職業隨機選擇一個選項
    const result = [];
    selectedRoles.forEach(role => {
        const roleOptions = byRole[role];
        result.push(roleOptions[Math.floor(Math.random() * roleOptions.length)]);
    });
    
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
    let descText = option.upgrade.description.replace("{value}", option.upgrade.increment || 1);
    desc.textContent = descText;
    
    const level = document.createElement("div");
    level.className = "upgrade-option-level";
    if (option.isMaxed) {
        level.textContent = "已滿級（效果：隊長最大HP+1）";
    } else {
        level.textContent = `Lv ${option.currentLevel + 1} / ${option.upgrade.maxLevel}`;
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
    
    upgradeLevels[option.role][option.key] += 1;
    
    // 如果是隊長血量升級，立即更新當前血量上限
    if (option.role === "leader" && option.key === "maxHp") {
        const newMaxHp = getLeaderMaxHp();
        leaderHP = Math.min(newMaxHp, leaderHP + 5); // 增加當前血量
    }
    
    upgradeOverlay.classList.add("hidden");
    isChoosingUpgrade = false;
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
        
        for (let i = 0; i < arrowCount; i++) {
            const spreadAngle = arrowCount > 1 ? (i - (arrowCount - 1) / 2) * 0.2 : 0;
            const offsetDistance = GRID_SIZE * 0.6;
            projectiles.push({
                x: segCenter.x + Math.cos(angle + spreadAngle) * offsetDistance,
                y: segCenter.y + Math.sin(angle + spreadAngle) * offsetDistance,
                vx: Math.cos(angle + spreadAngle) * arrowSpeed,
                vy: Math.sin(angle + spreadAngle) * arrowSpeed,
                damage: ARROW_DAMAGE,
                shooterIndex: index,
                framesAlive: 0
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
                damageEnemy(enemy, proj.damage);
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
    
    snake.forEach((segment, index) => {
        if (index === 0) return; // 跳過隊長
        if (segment.role !== "mage") return;
        
        const mageCenter = {
            x: segment.renderX * GRID_SIZE + GRID_SIZE / 2,
            y: segment.renderY * GRID_SIZE + GRID_SIZE / 2
        };
        
        const auraRadius = getMageAuraRadius();
        const auraDamage = getMageAuraDamage();
        
        let hasEnemyInRange = false;
        
        // 對範圍內敵人造成傷害
        // 視覺上光環的線條寬度會讓圓圈看起來更大
        // 線條寬度為 2-4px（根據是否有敵人），會向外延伸 lineWidth/2
        // 光環的視覺外邊緣距離法師中心 = auraRadius + lineWidth/2
        // 怪物也有大小（GRID_SIZE），怪物邊緣距離怪物中心 = GRID_SIZE/2
        // 當光環邊緣和怪物邊緣接觸時：
        //   怪物中心距離 - GRID_SIZE/2 = auraRadius + lineWidth/2
        //   怪物中心距離 = auraRadius + lineWidth/2 + GRID_SIZE/2
        // 使用最大線條寬度（4px）來計算，確保傷害範圍不會小於視覺範圍
        const maxLineWidth = 4; // 有敵人時的線條寬度
        const enemyRadius = GRID_SIZE / 2; // 怪物半徑
        const effectiveRadius = auraRadius + maxLineWidth / 2 + enemyRadius; // 有效傷害範圍（考慮光環線條和怪物大小）
        
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
            }
        });
        
        // 添加光環視覺特效
        // 如果有敵人在範圍內，光環會發光（更亮）
        effects.push({
            type: "aura",
            x: mageCenter.x,
            y: mageCenter.y,
            radius: auraRadius,
            alpha: hasEnemyInRange ? 0.6 : 0.2, // 有敵人時更亮
            life: 2 // 持續 2 幀，確保可見
        });
    });
}

function getMageAuraRadius() {
    return getUpgradedValue("mage", "auraRange", AURA_RADIUS);
}

function getMageAuraDamage() {
    return getUpgradedValue("mage", "auraDamage", AURA_DAMAGE);
}

// ========== 敵人傷害系統 ==========
function damageEnemy(enemy, amount) {
    if (!enemy || enemy.hp <= 0) return;
    
    const oldHp = enemy.hp;
    enemy.hp -= amount;
    enemy.hitTimer = 10; // 受傷閃爍時間
    enemy.hpTextTimer = 60; // HP 文字顯示時間
    
    // 添加傷害數字特效
    if (amount > 0) {
        effects.push({
            type: "text",
            text: `-${Math.ceil(amount)}`,
            x: enemy.x,
            y: enemy.y,
            life: 30,
            color: "#ef4444"
        });
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
  
  // 2. 繪製網格背景 (世界座標 -> 螢幕座標)
  // 優化：只繪製 Camera 視野內的網格
  const startCol = Math.floor(camera.x / GRID_SIZE);
  const endCol = startCol + Math.ceil(camera.width / GRID_SIZE) + 1;
  const startRow = Math.floor(camera.y / GRID_SIZE);
  const endRow = startRow + Math.ceil(camera.height / GRID_SIZE) + 1;
  
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  
  for (let c = startCol; c <= endCol; c++) {
      const x = c * GRID_SIZE - camera.x;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
  }
  for (let r = startRow; r <= endRow; r++) {
      const y = r * GRID_SIZE - camera.y;
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
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
          // 檢查是否在畫面內 (Culling)
          if (pos.x > -GRID_SIZE && pos.x < canvas.width && pos.y > -GRID_SIZE && pos.y < canvas.height) {
              ASSETS.item.draw(ctx, pos.x, pos.y, GRID_SIZE);
          }
      }
  });
  
  // 5. 繪製敵人
  enemies.forEach(e => {
      const pos = camera.transform(e.x - GRID_SIZE/2, e.y - GRID_SIZE/2);
      // 檢查是否在畫面內 (Culling)
      if (pos.x > -GRID_SIZE && pos.x < canvas.width && pos.y > -GRID_SIZE && pos.y < canvas.height) {
          ctx.save();
          
          // 受傷特效：變紅
          if (e.hitTimer > 0) {
              ctx.globalAlpha = 0.5;
              ctx.fillStyle = "#ef4444";
              ctx.fillRect(pos.x, pos.y, GRID_SIZE, GRID_SIZE);
              ctx.globalAlpha = 1;
          }
          
          ASSETS.enemy.draw(ctx, pos.x, pos.y, GRID_SIZE);
          
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
  for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const pos = camera.transform(s.renderX * GRID_SIZE, s.renderY * GRID_SIZE);
      const assetKey = s.role;
      if (ASSETS[assetKey]) {
          ASSETS[assetKey].draw(ctx, pos.x, pos.y, GRID_SIZE, s.facing);
      }
      
      // 隊長血條
      if (i === 0) {
          drawHealthBar(ctx, pos.x, pos.y - 15, GRID_SIZE, 5, leaderHP, getLeaderMaxHp());
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
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(e.text, pos.x, pos.y - (30 - e.life)); // 向上飄
          e.life--;
      } else if (e.type === "aura") {
          // 法師光環特效
          // 根據 alpha 判斷是否有敵人在範圍內（alpha > 0.4 表示有敵人）
          const isActive = e.alpha > 0.4;
          ctx.globalAlpha = e.alpha;
          ctx.strokeStyle = isActive ? "#93c5fd" : "#60a5fa"; // 有敵人時更亮的藍色
          ctx.lineWidth = isActive ? 4 : 2; // 有敵人時線條更粗
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
          ctx.stroke();
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
      }
      
      ctx.restore();
  });
  effects = effects.filter(e => e.life > 0);
  
  // 8. 繪製觸控軌跡 (Screen Coordinates - 不受 Camera 影響)
  drawTouchTrails();
  
  ctx.restore();
  
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
    
    // 繪製道具 (紫點) - 多個道具
    mCtx.fillStyle = "#a855f7";
    items.forEach(item => {
        if (item) {
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
    
    // 繪製蛇 (綠點) - 頭部較大
    mCtx.fillStyle = "#4ade80";
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

// 觸控軌跡
canvas.addEventListener("touchmove", (e) => {
    e.preventDefault(); // 防止捲動
    const touch = e.touches[0];
    touchTrails.push({
        x: touch.clientX,
        y: touch.clientY,
        life: 15 // 持續幀數
    });
    
    // 滑動控制邏輯
    handleTouchControl(touch);
}, { passive: false });

canvas.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    touchEndTime = 0;
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;
        touchEndTime = Date.now();
        
        // 記錄結束點用於繪製箭頭
        if (touchTrails.length > 0) {
            const lastPoint = touchTrails[touchTrails.length - 1];
            touchTrails.push({
                x: touchEndX,
                y: touchEndY,
                life: 15,
                isEnd: true // 標記為結束點
            });
        }
    }
}, { passive: false });

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchEndTime = 0;

function handleTouchControl(touch) {
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    
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
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
}

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
            const arrowLength = 20;
            const arrowWidth = 8;
            
            // 箭頭尖端位置
            const arrowTipX = lastPoint.x;
            const arrowTipY = lastPoint.y;
            
            // 箭頭兩側點
            const arrowLeftX = arrowTipX - arrowLength * Math.cos(angle) + arrowWidth * Math.cos(angle + Math.PI / 2);
            const arrowLeftY = arrowTipY - arrowLength * Math.sin(angle) + arrowWidth * Math.sin(angle + Math.PI / 2);
            const arrowRightX = arrowTipX - arrowLength * Math.cos(angle) + arrowWidth * Math.cos(angle - Math.PI / 2);
            const arrowRightY = arrowTipY - arrowLength * Math.sin(angle) + arrowWidth * Math.sin(angle - Math.PI / 2);
            
            // 繪製箭頭
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.beginPath();
            ctx.moveTo(arrowTipX, arrowTipY);
            ctx.lineTo(arrowLeftX, arrowLeftY);
            ctx.lineTo(arrowRightX, arrowRightY);
            ctx.closePath();
            ctx.fill();
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
            const data = doc.data();
            const record = {
                name: data.name ?? "無名勇者",
                kills: data.kills ?? 0,
                score: data.score ?? 0,
                date: data.date,
            };
            
            allData.push(record);
            
            if (data.date) {
                const recordDate = new Date(data.date);
                if (recordDate >= today && recordDate < tomorrow) {
                    todayData.push(record);
                }
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
function renderGuidePanel() {
    const guidePanel = document.getElementById("guidePanel");
    if (!guidePanel || !window.GUIDE_CONFIG) return;
    
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
    
    guidePanel.innerHTML = html;
}

// 主選單排行榜按鈕
const homeLeaderboardBtn = document.getElementById("homeLeaderboardBtn");
if (homeLeaderboardBtn) {
    homeLeaderboardBtn.addEventListener("click", () => {
        if (leaderboardModal) {
            leaderboardModal.classList.remove("hidden");
            updateLeaderboard();
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

pauseBtn.addEventListener("click", () => {
    isPaused = true;
    pauseModal.classList.remove("hidden");
});

// 排行榜按鈕（遊戲中）
if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", () => {
        isPaused = true;
        if (leaderboardModal) {
            leaderboardModal.classList.remove("hidden");
            updateLeaderboard();
        }
    });
}

// Modal 關閉按鈕
const leaderboardCloseBtn = document.getElementById("leaderboardCloseBtn");
const guideCloseBtn = document.getElementById("guideCloseBtn");

if (leaderboardCloseBtn) {
    leaderboardCloseBtn.addEventListener("click", () => {
        if (leaderboardModal) {
            leaderboardModal.classList.add("hidden");
        }
        // 檢查是否還有其他 Modal 打開
        if (!pauseModal || pauseModal.classList.contains("hidden")) {
            if (!guideModal || guideModal.classList.contains("hidden")) {
                isPaused = false;
            }
        }
    });
}

if (guideCloseBtn) {
    guideCloseBtn.addEventListener("click", () => {
        if (guideModal) {
            guideModal.classList.add("hidden");
        }
        // 檢查是否還有其他 Modal 打開
        if (!pauseModal || pauseModal.classList.contains("hidden")) {
            if (!leaderboardModal || leaderboardModal.classList.contains("hidden")) {
                isPaused = false;
            }
        }
    });
}

document.getElementById("pauseResumeBtn").addEventListener("click", () => {
    pauseModal.classList.add("hidden");
    startCountdown();
});

document.getElementById("pauseHomeBtn").addEventListener("click", () => {
    window.location.reload(); // 簡單重置
});

function triggerGameOver() {
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
}

document.getElementById("restartBtn").addEventListener("click", startGame);
document.getElementById("homeBtn").addEventListener("click", () => window.location.reload());

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
            
            if (uploadStatus) {
                uploadStatus.textContent = "上傳成功！";
                uploadStatus.style.color = "#4ade80";
            }
            
            // 更新排行榜
            if (leaderboardModal && !leaderboardModal.classList.contains("hidden")) {
                updateLeaderboard();
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
    countdownOverlay.classList.remove("hidden");
    countdownNumber.innerText = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.innerText = count;
            // reset animation
            countdownNumber.style.animation = 'none';
            countdownNumber.offsetHeight; /* trigger reflow */
            countdownNumber.style.animation = null; 
        } else {
            clearInterval(interval);
            countdownOverlay.classList.add("hidden");
            isCountdown = false;
            isPaused = false;
        }
    }, 1000);
}

// 簡單的升級與 UI 更新 Mock (需整合原 script.js 完整邏輯)
function updateLevelUI() {
    playerLevel.innerText = playerLevelValue;
    // Mock exp logic
    const req = 100 * Math.pow(1.3, playerLevelValue);
    const pct = Math.min(100, (playerExp / req) * 100);
    expBarFill.style.width = `${pct}%`;
    expText.innerText = `${playerExp}/${Math.floor(req)}`;
}
