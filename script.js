const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const killValue = document.getElementById("killValue");
const overlay = document.getElementById("gameOverOverlay");
const restartBtn = document.getElementById("restartBtn");
const loaderOverlay = document.getElementById("loaderOverlay");
const loaderText = document.getElementById("loaderText");
const loaderBar = document.getElementById("loaderBar");
const maxLengthValue = document.getElementById("maxLengthValue");
const finalKillValue = document.getElementById("finalKillValue");
const leaderboardList = document.getElementById("leaderboardList");
const playerNameInput = document.getElementById("playerNameInput");
const uploadScoreBtn = document.getElementById("uploadScoreBtn");
const uploadStatus = document.getElementById("uploadStatus");
const startOverlay = document.getElementById("startOverlay");
const startPlayerNameInput = document.getElementById("startPlayerNameInput");
const startGameBtn = document.getElementById("startGameBtn");
const startGuidePanel = document.getElementById("startGuidePanel");

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
let gridWidth = Math.floor(canvas.width / GRID_SIZE);
let gridHeight = Math.floor(canvas.height / GRID_SIZE);
let item = null;
let recruitQueue = [];
let enemies = [];
let projectiles = [];
let effects = [];
let lastMoveTime = 0;
let lastEnemySpawn = 0;
let isGameOver = false;
let animationId = null;
let leaderHP = LEADER_MAX_HP;
let killCount = 0;
let maxLengthThisRun = 1;
let assetsLoaded = 0;
let assetsReady = false;
let isUploading = false;
let hasUploadedThisRun = false;

window.subscribeLeaderboard = subscribeLeaderboard;

if (window.firebaseReady && window.firebaseLeaderboardRef) {
  subscribeLeaderboard();
} else {
  const checkFirebase = setInterval(() => {
    if (window.firebaseReady && window.firebaseLeaderboardRef) {
      subscribeLeaderboard();
      clearInterval(checkFirebase);
    }
  }, 100);
}

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
    loaderOverlay?.classList.add("hidden");
    // 檢查是否有保存的名字，如果有才開始遊戲
    const savedName = localStorage.getItem("playerName");
    if (savedName && savedName.trim() !== "") {
      // 有名字，直接開始遊戲
      if (startOverlay) {
        startOverlay.classList.add("hidden");
      }
      startGame();
    } else {
      // 沒有名字，顯示開始畫面
      if (startOverlay) {
        startOverlay.classList.remove("hidden");
      }
      if (startPlayerNameInput) {
        startPlayerNameInput.focus();
      }
    }
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

function startGame() {
  if (!assetsReady) return;
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
  overlay.classList.add("hidden");
  lastMoveTime = 0;
  lastEnemySpawn = 0;
  leaderHP = LEADER_MAX_HP;
  maxLengthThisRun = snake.length;
  maxLengthValue.textContent = snake.length;
  finalKillValue.textContent = killCount;
  hasUploadedThisRun = false;
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
  enemies.push({
    x,
    y,
    hp: ENEMY_HP,
    maxHp: ENEMY_HP,
    hitTimer: 0,
    hpTextTimer: 0,
    dead: false,
  });
}

function moveSnake(timestamp) {
  direction = nextDirection;
  // 更新面向（只在左右移動時）
  if (direction.x !== 0) {
    facing = direction.x > 0 ? 1 : -1;
  }
  const head = snake[0];
  const nextX = head.x + direction.x;
  const nextY = head.y + direction.y;

  if (nextX < 0 || nextY < 0 || nextX >= gridWidth || nextY >= gridHeight) {
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

  for (let i = 1; i < snake.length; i++) {
    snake[i].x = previousPositions[i - 1].x;
    snake[i].y = previousPositions[i - 1].y;
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
    if (timestamp - (segment.lastShot || 0) < ARCHER_COOLDOWN) return;
    const enemy = findNearestEnemy(segment);
    if (!enemy) return;
    const segCenter = gridToPixel(segment);
    const dist = distance(segCenter.x, segCenter.y, enemy.x, enemy.y);
    if (dist > ATTACK_RANGE) return;
    const angle = Math.atan2(enemy.y - segCenter.y, enemy.x - segCenter.x);
    projectiles.push({
      x: segCenter.x,
      y: segCenter.y,
      vx: Math.cos(angle) * PROJECTILE_SPEED,
      vy: Math.sin(angle) * PROJECTILE_SPEED,
      damage: ARROW_DAMAGE,
    });
    segment.lastShot = timestamp;
  });
}

function handleMageAura() {
  snake.forEach((segment, index) => {
    if (index === 0) return;
    if (segment.role !== "mage") return;
    const segCenter = gridToPixel(segment);
    enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const dist = distance(segCenter.x, segCenter.y, enemy.x, enemy.y);
      if (dist <= AURA_RADIUS) {
        damageEnemy(enemy, AURA_DAMAGE);
        effects.push({
          type: "aura",
          x: segCenter.x,
          y: segCenter.y,
          radius: AURA_RADIUS,
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
    if (
      proj.x < 0 ||
      proj.y < 0 ||
      proj.x > canvas.width ||
      proj.y > canvas.height
    ) {
      return false;
    }
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const dist = distance(proj.x, proj.y, enemy.x, enemy.y);
      if (dist < GRID_SIZE * 0.4) {
        damageEnemy(enemy, proj.damage);
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
      damageLeader(LEADER_COLLISION_DAMAGE, enemy.x, enemy.y);
      spawnExplosion(enemy.x, enemy.y);
       registerKill(enemy.x, enemy.y);
      return false;
    }
    const bodyResult = handleBodyCollision(enemy, removeSet);
    if (bodyResult === "kill") {
      registerKill(enemy.x, enemy.y);
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
    removeSet.add(collidedIndex);
    spawnExplosion(
      collidedRect.x + collidedRect.size / 2,
      collidedRect.y + collidedRect.size / 2
    );
    healLeader(LEADER_HEAL_ON_KILL, enemy.x, enemy.y);
    return "kill";
  }

  const knightIndex = findKnightIndex(removeSet);
  if (knightIndex !== -1) {
    const knight = snake[knightIndex];
    removeSet.add(knightIndex);
    spawnExplosion(
      knight.x * GRID_SIZE + GRID_SIZE / 2,
      knight.y * GRID_SIZE + GRID_SIZE / 2
    );
    healLeader(LEADER_HEAL_ON_KILL, enemy.x, enemy.y);
    return "kill";
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
    registerKill(enemy.x, enemy.y);
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

function damageLeader(amount, sourceX, sourceY) {
  if (isGameOver) return;
  leaderHP = Math.max(0, leaderHP - amount);
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
  leaderHP = Math.min(LEADER_MAX_HP, leaderHP + amount);
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

function registerKill(x, y) {
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

function triggerGameOver() {
  if (isGameOver) return;
  isGameOver = true;
  maxLengthValue.textContent = maxLengthThisRun;
  finalKillValue.textContent = killCount;
  resetUploadForm();
  overlay.classList.remove("hidden");
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (item) {
    const x = item.x * GRID_SIZE;
    const y = item.y * GRID_SIZE;
    ASSETS.item.draw(x, y, GRID_SIZE);
  }

  snake.forEach((segment, index) => {
    // 使用插值後的視覺位置
    const renderX = (segment.renderX !== undefined ? segment.renderX : segment.x) * GRID_SIZE;
    const renderY = (segment.renderY !== undefined ? segment.renderY : segment.y) * GRID_SIZE;
    const x = renderX;
    const y = renderY;
    if (index === 0) {
      // 隊長使用當前的 facing
      ASSETS.leader.draw(x, y, GRID_SIZE, facing);
      if (leaderHP < LEADER_MAX_HP) {
        drawHealthBar(
          x,
          y - 8,
          GRID_SIZE,
          4,
          leaderHP,
          LEADER_MAX_HP
        );
      }
    } else if (segment.role && ASSETS[segment.role]) {
      // 其他勇者根據前一個 segment 的位置決定面向
      let segmentFacing = facing;
      if (index > 0) {
        const prevSegment = snake[index - 1];
        const currentX = segment.x;
        const prevX = prevSegment.x;
        if (currentX !== prevX) {
          // 有左右移動，根據位置決定面向
          segmentFacing = currentX > prevX ? 1 : -1;
        } else {
          // 沒有左右移動（上下移動），保持前一個 segment 的 facing
          if (prevSegment.facing !== undefined) {
            segmentFacing = prevSegment.facing;
          } else if (index > 1) {
            // 如果前一個也沒有 facing，繼續往前找
            let foundFacing = facing;
            for (let j = index - 1; j >= 0; j--) {
              if (snake[j].facing !== undefined) {
                foundFacing = snake[j].facing;
                break;
              }
            }
            segmentFacing = foundFacing;
          }
        }
      }
      segment.facing = segmentFacing; // 保存面向供下次使用
      ASSETS[segment.role].draw(x, y, GRID_SIZE, segmentFacing);
    } else {
      drawFallbackBlock("#64748b", () => {}, x, y, GRID_SIZE);
    }
    // 繪製法師光環（在邊框之前）
    if (segment.role === "mage") {
      ctx.strokeStyle = "rgba(59,130,246,0.2)";
      ctx.beginPath();
      ctx.arc(x + GRID_SIZE / 2, y + GRID_SIZE / 2, AURA_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 繪製隨機顏色邊框（最後繪製，確保在最上層）
    if (segment.borderColor) {
      ctx.strokeStyle = segment.borderColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    }
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
    if (enemy.hpTextTimer > 0) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "16px 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        `HP ${Math.max(0, Math.ceil(enemy.hp))}`,
        enemy.x,
        enemy.y - GRID_SIZE * 0.6
      );
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

restartBtn.addEventListener("click", () => {
  if (!assetsReady) return;
  overlay.classList.add("hidden");
  hasUploadedThisRun = false;
  // 檢查是否有保存的名字
  const savedName = localStorage.getItem("playerName");
  if (savedName && savedName.trim() !== "") {
    // 有名字，直接開始遊戲
    startGame();
  } else {
    // 沒有名字，顯示開始畫面
    if (startOverlay) {
      startOverlay.classList.remove("hidden");
    }
    if (startPlayerNameInput) {
      startPlayerNameInput.focus();
    }
  }
});

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
  } catch (error) {
    console.error("Failed to upload score", error);
    uploadStatus.textContent = "上傳失敗，請稍後再試。";
    uploadStatus.className = "upload-status error";
    uploadScoreBtn.disabled = false;
  } finally {
    isUploading = false;
  }
}

function subscribeLeaderboard() {
  if (!leaderboardList || !window.firebaseLeaderboardRef) return;
  const leaderboardQuery = window.firebaseQuery(
    window.firebaseLeaderboardRef,
    window.firebaseOrderBy("kills", "desc"),
    window.firebaseLimit(10)
  );
  window.firebaseOnSnapshot(
    leaderboardQuery,
    (snapshot) => {
      if (snapshot.empty) {
        leaderboardList.innerHTML = "<li>尚無紀錄，快來寫下第一筆吧！</li>";
        return;
      }
      leaderboardList.innerHTML = "";
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        const kills = data.kills ?? 0;
        const score = data.score ?? 0;
        li.innerHTML = `
          <span class="lb-name">${escapeHtml(data.name ?? "無名勇者")}</span>
          <span class="lb-kills">${kills} 擊殺</span>
          <span class="lb-score">${score} 格</span>
        `;
        leaderboardList.appendChild(li);
      });
    },
    (error) => {
      console.error("Leaderboard subscribe failed", error);
      leaderboardList.innerHTML = "<li>排行榜載入失敗。</li>";
    }
  );
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
  const guidePanel = document.getElementById("guidePanel");
  renderGuidePanelContent(guidePanel);
}

// 渲染開始畫面的快速指引
function renderStartGuidePanel() {
  if (startGuidePanel) {
    renderGuidePanelContent(startGuidePanel);
  }
}

// 頁面載入時渲染快速指引
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    renderGuidePanel();
    renderStartGuidePanel();
    checkAndShowStartScreen();
  });
} else {
  renderGuidePanel();
  renderStartGuidePanel();
  checkAndShowStartScreen();
}

// 檢查並顯示開始畫面
function checkAndShowStartScreen() {
  const savedName = localStorage.getItem("playerName");
  if (!savedName || savedName.trim() === "") {
    // 沒有保存的名字，顯示開始畫面
    if (startOverlay) {
      startOverlay.classList.remove("hidden");
    }
    if (startPlayerNameInput) {
      startPlayerNameInput.value = "";
      startPlayerNameInput.focus();
    }
  } else {
    // 有保存的名字，隱藏開始畫面（等待資源載入後直接開始遊戲）
    if (startOverlay) {
      startOverlay.classList.add("hidden");
    }
  }
}

// 啟動遊戲按鈕事件
if (startGameBtn) {
  startGameBtn.addEventListener("click", () => {
    const name = startPlayerNameInput ? startPlayerNameInput.value.trim() : "";
    if (!name) {
      alert("請先輸入你的勇者名！");
      if (startPlayerNameInput) {
        startPlayerNameInput.focus();
      }
      return;
    }
    // 保存名字
    localStorage.setItem("playerName", name);
    // 隱藏開始畫面
    if (startOverlay) {
      startOverlay.classList.add("hidden");
    }
    // 如果資源已載入，開始遊戲
    if (assetsReady) {
      startGame();
    }
  });
}

// Enter 鍵啟動遊戲
if (startPlayerNameInput) {
  startPlayerNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      startGameBtn?.click();
    }
  });
}

