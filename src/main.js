import * as PIXI from "pixi.js"

////////////////////////////////////////////////////
// CONFIG
////////////////////////////////////////////////////
const BASE_WIDTH = 1080
const BASE_HEIGHT = 1920

const COLS = 6
const ROWS = 9
const GRID_WIDTH = 900
const CELL_SIZE = GRID_WIDTH / COLS
const GRID_HEIGHT = CELL_SIZE * ROWS

const COLORS = [
  0xff4d6d,
  0x4d96ff,
  0x6bff95,
  0xffd93d,
  0xc77dff
]

////////////////////////////////////////////////////
// APP
////////////////////////////////////////////////////
const app = new PIXI.Application({
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  backgroundColor: 0x0f0f1a,
  antialias: true
})

document.body.style.margin = "0"
document.body.style.background = "#000"
document.body.style.overflow = "hidden"
document.body.appendChild(app.view)

function resize() {
  const scale = Math.min(
    window.innerWidth / BASE_WIDTH,
    window.innerHeight / BASE_HEIGHT
  )

  app.view.style.width = BASE_WIDTH * scale + "px"
  app.view.style.height = BASE_HEIGHT * scale + "px"
  app.view.style.position = "absolute"
  app.view.style.left = "50%"
  app.view.style.top = "50%"
  app.view.style.transform = "translate(-50%, -50%)"
}
window.addEventListener("resize", resize)
resize()

////////////////////////////////////////////////////
// GAME STATE
////////////////////////////////////////////////////
let board = []
let selectedTile = null
let isProcessing = false
let score = 0
let combo = 0

let hero = {
  maxHP: 100,
  hp: 100,
  attack: 10,
  level: 1,
  exp: 0,
  expToLevel: 50
};

let enemy = {
  maxHp: 250,
  hp: 250,
  attack: 8
};

let gameOverText = null;
let restartButton = null;

////////////////////////////////////////////////////
// UI
////////////////////////////////////////////////////
const scoreText = new PIXI.Text("Score: 0", {
  fontFamily: "Arial",
  fontSize: 60,
  fill: 0xffffff
})
scoreText.x = 60
scoreText.y = 80
app.stage.addChild(scoreText)

////////////////////////////////////////////////////
// GRID CONTAINER
////////////////////////////////////////////////////
const gridContainer = new PIXI.Container()
app.stage.addChild(gridContainer)
gridContainer.x = (BASE_WIDTH - GRID_WIDTH) / 2
gridContainer.y = (BASE_HEIGHT - GRID_HEIGHT) / 2

////////////////////////////////////////////////////
// HP BAR UI
////////////////////////////////////////////////////
const heroHPBar = new PIXI.Graphics()
const enemyHPBar = new PIXI.Graphics()

function drawHPBars() {

  heroHPBar.clear()
  enemyHPBar.clear()

  const barWidth = 600
  const barHeight = 30
  
if (enemy.hp <= 0) {
    console.log("ENEMY DEAD")
}
  // ===== ENEMY HP (ÜSTTE) =====
  enemyHPBar.beginFill(0x222222)
  enemyHPBar.drawRoundedRect(0, 0, barWidth, barHeight, 10)
  enemyHPBar.endFill()

  enemyHPBar.beginFill(0xff3b3b)
  enemyHPBar.drawRoundedRect(
    0,
    0,
    barWidth * (enemy.hp / enemy.maxHp),
    barHeight,
    10
  )
  enemyHPBar.endFill()

  enemyHPBar.x = (BASE_WIDTH - barWidth) / 2
  enemyHPBar.y = gridContainer.y - 80


  // ===== HERO HP (ALTTA) =====
  heroHPBar.beginFill(0x222222)
  heroHPBar.drawRoundedRect(0, 0, barWidth, barHeight, 10)
  heroHPBar.endFill()

  heroHPBar.beginFill(0x3bff6a)
  heroHPBar.drawRoundedRect(
    0,
    0,
    barWidth * (hero.hp / hero.maxHP),
    barHeight,
    10
  )
  heroHPBar.endFill()

  heroHPBar.x = (BASE_WIDTH - barWidth) / 2
  heroHPBar.y = gridContainer.y + GRID_HEIGHT + 50
}

app.stage.addChild(enemyHPBar)
app.stage.addChild(heroHPBar)

drawHPBars()

////////////////////////////////////////////////////
// UTIL
////////////////////////////////////////////////////
function areAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

function createTile(row, col, type) {
  const tile = new PIXI.Graphics()
  tile.beginFill(COLORS[type])
  tile.drawRoundedRect(0, 0, CELL_SIZE - 6, CELL_SIZE - 6, 16)
  tile.endFill()

  tile.x = col * CELL_SIZE
  tile.y = row * CELL_SIZE
  tile.eventMode = "static"
  tile.cursor = "pointer"

  const tileData = { row, col, type, sprite: tile }
  tile.on("pointerdown", () => selectTile(tileData))

  gridContainer.addChild(tile)
  return tileData
}

////////////////////////////////////////////////////
// SELECTION
////////////////////////////////////////////////////
function selectTile(tile) {

  if (isProcessing) return

  if (!selectedTile) {
    selectedTile = tile
    tile.sprite.scale.set(1.1)
    return
  }

  if (selectedTile === tile) {
    tile.sprite.scale.set(1)
    selectedTile = null
    return
  }

  if (areAdjacent(selectedTile, tile)) {
    selectedTile.sprite.scale.set(1)
    swapTiles(selectedTile, tile)
    selectedTile = null
  } else {
    selectedTile.sprite.scale.set(1)
    selectedTile = tile
    tile.sprite.scale.set(1.1)
  }
}

////////////////////////////////////////////////////
// SWAP
////////////////////////////////////////////////////
function swapTiles(a, b, revert = false) {

  isProcessing = true

  animateMove(a.sprite, b.col * CELL_SIZE, b.row * CELL_SIZE)
  animateMove(b.sprite, a.col * CELL_SIZE, a.row * CELL_SIZE)

  board[a.row][a.col] = b
  board[b.row][b.col] = a

  const tempRow = a.row
  const tempCol = a.col

  a.row = b.row
  a.col = b.col
  b.row = tempRow
  b.col = tempCol

  setTimeout(() => {

    const matches = findMatches()

    if (matches.length === 0 && !revert) {
      swapTiles(a, b, true)
      return
    }

    if (matches.length > 0) {
      removeMatches(matches)
    } else {
      isProcessing = false
    }

  }, 250)
}

////////////////////////////////////////////////////
// MATCH FINDER
////////////////////////////////////////////////////
function findMatches() {

  const matches = new Set()

  for (let row = 0; row < ROWS; row++) {
    let chain = [board[row][0]]

    for (let col = 1; col < COLS; col++) {
      const current = board[row][col]
      if (current && chain[0].type === current.type) {
        chain.push(current)
      } else {
        if (chain.length >= 3) chain.forEach(t => matches.add(t))
        chain = [current]
      }
    }
    if (chain.length >= 3) chain.forEach(t => matches.add(t))
  }

  for (let col = 0; col < COLS; col++) {
    let chain = [board[0][col]]

    for (let row = 1; row < ROWS; row++) {
      const current = board[row][col]
      if (current && chain[0].type === current.type) {
        chain.push(current)
      } else {
        if (chain.length >= 3) chain.forEach(t => matches.add(t))
        chain = [current]
      }
    }
    if (chain.length >= 3) chain.forEach(t => matches.add(t))
  }

  return Array.from(matches)
}

////////////////////////////////////////////////////
// REMOVE
////////////////////////////////////////////////////
function removeMatches(matches) {
  combo++
  const damage = matches.length * hero.attack * combo
  enemy.hp -= damage
  
  if (enemy.hp <= 0) {
    enemy.hp = 0
  }

  drawHPBars()
  
  matches.forEach(tile => {
    score += 100 * combo
    showFloatingScore(tile.sprite.x, tile.sprite.y, 100 * combo)
    gridContainer.removeChild(tile.sprite)
    board[tile.row][tile.col] = null
  })

  scoreText.text = "Score: " + score
  
  // Wait for score animations before gravity
  setTimeout(applyGravity, 250)
}

////////////////////////////////////////////////////
// GRAVITY
////////////////////////////////////////////////////
function applyGravity() {

  for (let col = 0; col < COLS; col++) {
    for (let row = ROWS - 1; row >= 0; row--) {

      if (!board[row][col]) {

        for (let search = row - 1; search >= 0; search--) {
          if (board[search][col]) {

            const tile = board[search][col]
            board[row][col] = tile
            board[search][col] = null
            tile.row = row

            animateMove(tile.sprite, col * CELL_SIZE, row * CELL_SIZE)
            break
          }
        }
      }
    }
  }

  setTimeout(spawnTiles, 250)
}

////////////////////////////////////////////////////
// SPAWN
////////////////////////////////////////////////////
function spawnTiles() {

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {

      if (!board[row][col]) {

        const type = Math.floor(Math.random() * COLORS.length)
        const tile = createTile(row, col, type)

        tile.sprite.y = -CELL_SIZE
        animateMove(tile.sprite, col * CELL_SIZE, row * CELL_SIZE)

        board[row][col] = tile
      }
    }
  }

  setTimeout(checkChain, 300)
}

////////////////////////////////////////////////////
// CHAIN
////////////////////////////////////////////////////
function checkChain() {
  const matches = findMatches()

  if (matches.length > 0) {
    removeMatches(matches)
  } else {
    const lastCombo = combo
    combo = 0
    isProcessing = false
    
    // Only trigger turn if a move was actually made (combo > 0)
    if (lastCombo > 0) {
      if (enemy.hp <= 0) {
        handleEnemyDeath()
      } else {
        enemyTurn()
      }
    }
  }
}

////////////////////////////////////////////////////
// ANIMATION
////////////////////////////////////////////////////
function animateMove(sprite, targetX, targetY) {

  const speed = 0.25

  const tickerFunc = () => {
    const dx = targetX - sprite.x
    const dy = targetY - sprite.y

    sprite.x += dx * speed
    sprite.y += dy * speed

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      sprite.x = targetX
      sprite.y = targetY
      app.ticker.remove(tickerFunc)
    }
  }

  app.ticker.add(tickerFunc)
}

////////////////////////////////////////////////////
// FLOATING SCORE
////////////////////////////////////////////////////
function showFloatingScore(x, y, value) {

  const text = new PIXI.Text("+" + value, {
    fontFamily: "Arial",
    fontSize: 48,
    fill: 0xffffff
  })

  text.x = x
  text.y = y
  gridContainer.addChild(text)

  let life = 0

  app.ticker.add(function float() {
    text.y -= 2
    text.alpha -= 0.02
    life++

    if (life > 50) {
      gridContainer.removeChild(text)
      app.ticker.remove(float)
    }
  })
}

////////////////////////////////////////////////////
// COMBAT LOGIC
////////////////////////////////////////////////////
function enemyTurn() {
  if (isProcessing || enemy.hp <= 0 || hero.hp <= 0) return;

  isProcessing = true;
  
  setTimeout(() => {
    hero.hp -= enemy.attack;
    if (hero.hp < 0) hero.hp = 0;
    
    drawHPBars();
    showFloatingScore(heroHPBar.x + 300, heroHPBar.y, "-" + enemy.attack);
    
    if (hero.hp <= 0) {
      gameOver();
    } else {
      isProcessing = false;
    }
  }, 1000);
}

function handleEnemyDeath() {
  isProcessing = true;
  
  const expGained = 25;
  hero.exp += expGained;
  showFloatingScore(enemyHPBar.x + 300, enemyHPBar.y, "+" + expGained + " EXP");
  
  if (hero.exp >= hero.expToLevel) {
    levelUp();
  }
  
  setTimeout(() => {
    spawnNewEnemy();
  }, 1500);
}

function spawnNewEnemy() {
  enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
  enemy.attack = Math.floor(enemy.attack * 1.1);
  enemy.hp = enemy.maxHp;
  
  drawHPBars();
  isProcessing = false;
}

function levelUp() {
  hero.level++;
  hero.exp -= hero.expToLevel;
  hero.expToLevel = Math.floor(hero.expToLevel * 1.5);
  hero.maxHP += 20;
  hero.hp = hero.maxHP;
  hero.attack += 5;
  
  showFloatingScore(heroHPBar.x + 100, heroHPBar.y - 50, "LEVEL UP! Lvl " + hero.level);
  drawHPBars();
}

function gameOver() {
  isProcessing = true;
  
  gameOverText = new PIXI.Text("GAME OVER", {
    fontFamily: "Arial",
    fontSize: 120,
    fill: 0xff3b3b,
    fontWeight: "bold"
  });
  gameOverText.anchor.set(0.5);
  gameOverText.x = BASE_WIDTH / 2;
  gameOverText.y = BASE_HEIGHT / 2 - 100;
  app.stage.addChild(gameOverText);

  restartButton = new PIXI.Graphics();
  restartButton.beginFill(0xffffff);
  restartButton.drawRoundedRect(0, 0, 300, 100, 20);
  restartButton.endFill();
  restartButton.x = BASE_WIDTH / 2 - 150;
  restartButton.y = BASE_HEIGHT / 2 + 50;
  restartButton.eventMode = "static";
  restartButton.cursor = "pointer";
  
  const btnText = new PIXI.Text("RESTART", {
    fontFamily: "Arial",
    fontSize: 48,
    fill: 0x000000
  });
  btnText.anchor.set(0.5);
  btnText.x = 150;
  btnText.y = 50;
  restartButton.addChild(btnText);
  
  restartButton.on("pointerdown", resetGame);
  app.stage.addChild(restartButton);
}

function resetGame() {
  if (gameOverText) app.stage.removeChild(gameOverText);
  if (restartButton) app.stage.removeChild(restartButton);
  gameOverText = null;
  restartButton = null;
  
  hero.maxHP = 100;
  hero.hp = 100;
  hero.attack = 10;
  hero.level = 1;
  hero.exp = 0;
  hero.expToLevel = 50;
  
  enemy.maxHp = 250;
  enemy.hp = 250;
  enemy.attack = 8;
  
  score = 0;
  combo = 0;
  scoreText.text = "Score: 0";
  
  drawHPBars();
  
  // Clear and reset board
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row] && board[row][col]) {
        gridContainer.removeChild(board[row][col].sprite);
      }
    }
  }
  
  for (let row = 0; row < ROWS; row++) {
    board[row] = []
    for (let col = 0; col < COLS; col++) {
      const type = Math.floor(Math.random() * COLORS.length);
      board[row][col] = createTile(row, col, type);
    }
  }
  
  isProcessing = false;
}

////////////////////////////////////////////////////
// INIT BOARD
////////////////////////////////////////////////////
for (let row = 0; row < ROWS; row++) {
  board[row] = []
  for (let col = 0; col < COLS; col++) {
    const type = Math.floor(Math.random() * COLORS.length)
    board[row][col] = createTile(row, col, type)
  }
}