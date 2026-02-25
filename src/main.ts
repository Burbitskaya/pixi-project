import {
  Application,
  Assets,
  Sprite,
  Texture,
  Rectangle,
  Container,
} from "pixi.js";

// --- Типы данных Tiled ---
interface TiledLayer {
  id: number;
  name: string;
  data: number[];
  width: number;
  height: number;
}

interface TiledObject {
  gid: number;
  height: number;
  id: number;
  name: string;
  rotation: number;
  type: string;
  visible: boolean;
  width: number;
  x: number;
  y: number;
}

interface TiledObjectLayer {
  draworder: string;
  id: number;
  name: string;
  objects: TiledObject[];
  opacity: number;
  type: 'objectgroup';
  visible: boolean;
  x: number;
  y: number;
}

interface TiledMap {
  layers: (TiledLayer | TiledObjectLayer)[];
  tilewidth: number;
  tileheight: number;
  width: number;
  height: number;
  tilesets: { firstgid: number; source: string }[];
}

// --- Игровые типы ---
interface Enemy {
  sprite: Sprite;
  col: number;          // логические координаты клетки
  row: number;
  health: number;
  isMoving: boolean;
  moveStartX: number;
  moveStartY: number;
  moveTargetX: number;
  moveTargetY: number;
  moveProgress: number;
}

interface Item {
  sprite: Sprite;
  type: string;         // 'key' или 'helth'
  col: number;
  row: number;
}

// --- Основная функция ---
(async () => {
  const app = new Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Загружаем ресурсы
  const [mapData, tilesetTexture, heroTexture] = await Promise.all([
    fetch("/assets/map.json").then((res) => res.json()) as Promise<TiledMap>,
    Assets.load("/assets/tileset.png"),
    Assets.load("/assets/hero.png"),
  ]);

  const tileSize = mapData.tilewidth; // 32
  const tilesPerRow = Math.floor(tilesetTexture.width / tileSize);
  const firstgid = mapData.tilesets[0]?.firstgid ?? 1; // обычно 1

  // Находим слои карты
  const groundLayer = mapData.layers.find((layer): layer is TiledLayer => layer.id === 1);
  if (!groundLayer) throw new Error('Слой "land" не найден');
  const objectLayer = mapData.layers.find((layer): layer is TiledObjectLayer => layer.name === 'object');
  const warriorLayer = mapData.layers.find((layer): layer is TiledObjectLayer => layer.name === 'wariors');

  // Контейнер для всего игрового мира (двигается камерой)
  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  // Контейнер для статической карты
  const mapContainer = new Container();
  worldContainer.addChild(mapContainer);

  // --- Отрисовка карты (тайловый слой) ---
  for (let row = 0; row < groundLayer.height; row++) {
    for (let col = 0; col < groundLayer.width; col++) {
      const gid = groundLayer.data[row * groundLayer.width + col];
      if (gid === 0) continue;

      const localTileId = gid - firstgid;
      const tileX = (localTileId % tilesPerRow) * tileSize;
      const tileY = Math.floor(localTileId / tilesPerRow) * tileSize;

      const tileTexture = new Texture({
        source: tilesetTexture.source,
        frame: new Rectangle(tileX, tileY, tileSize, tileSize),
      });

      const tileSprite = new Sprite(tileTexture);
      tileSprite.x = col * tileSize;
      tileSprite.y = row * tileSize;
      mapContainer.addChild(tileSprite);
    }
  }

  // --- Анимация персонажа (вырезаем кадры из hero.png) ---
  const frameWidth = 32;
  const frameHeight = 36; // подстрой под свой спрайт-лист
  const directions = ["up", "right", "down", "left"]; // порядок рядов в спрайт-листе
  const playerTextures: Record<string, Texture[]> = {
    down: [], left: [], right: [], up: [],
  };

  for (let row = 0; row < 4; row++) {
    const dir = directions[row];
    for (let col = 0; col < 3; col++) {
      const frame = new Texture({
        source: heroTexture.source,
        frame: new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight),
      });
      playerTextures[dir].push(frame);
    }
  }

  // Создаём спрайт игрока
  const playerSprite = new Sprite(playerTextures.down[0]);
  playerSprite.anchor.set(0.5);
  const startCol = 3;
  const startRow = 1;
  playerSprite.x = startCol * tileSize + tileSize / 2;
  playerSprite.y = startRow * tileSize + tileSize / 2;
  worldContainer.addChild(playerSprite);

  // --- Проходимые тайлы (GID, по которым можно ходить) ---
  const walkableGids = new Set([5725, 6593, 6597, 6841, 8390, 8774]);

  function isWalkable(col: number, row: number): boolean {
  if (!groundLayer) return false;
  if (col < 0 || col >= groundLayer.width || row < 0 || row >= groundLayer.height) return false;
  const gid = groundLayer.data[row * groundLayer.width + col];
  return walkableGids.has(gid);
  }

  // --- Предметы (слой object) ---
  const items: Item[] = [];
  if (objectLayer) {
    for (const obj of objectLayer.objects) {
      const col = Math.floor(obj.x / tileSize);
      const row = Math.floor(obj.y / tileSize);
      const localTileId = obj.gid - firstgid;
      const tileX = (localTileId % tilesPerRow) * tileSize;
      const tileY = Math.floor(localTileId / tilesPerRow) * tileSize;
      const texture = new Texture({
        source: tilesetTexture.source,
        frame: new Rectangle(tileX, tileY, tileSize, tileSize),
      });
      const sprite = new Sprite(texture);
      sprite.x = col * tileSize;
      sprite.y = row * tileSize;
      worldContainer.addChild(sprite);
console.log(`Создаю предмет: тип=${obj.type}, col=${col}, row=${row}, gid=${obj.gid}`);
      items.push({ sprite, type: obj.type, col, row });
    }
  }

  // --- Враги (слой wariors) ---
  const enemies: Enemy[] = [];
  if (warriorLayer) {
    for (const obj of warriorLayer.objects) {
      const col = Math.floor(obj.x / tileSize);
      const row = Math.floor(obj.y / tileSize);
      const localTileId = obj.gid - firstgid;
      const tileX = (localTileId % tilesPerRow) * tileSize;
      const tileY = Math.floor(localTileId / tilesPerRow) * tileSize;
      const texture = new Texture({
        source: tilesetTexture.source,
        frame: new Rectangle(tileX, tileY, tileSize, tileSize),
      });
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = col * tileSize + tileSize / 2;
      sprite.y = row * tileSize + tileSize / 2;
      worldContainer.addChild(sprite);

      enemies.push({
        sprite,
        col,
        row,
        health: 1,
        isMoving: false,
        moveStartX: 0, moveStartY: 0,
        moveTargetX: 0, moveTargetY: 0,
        moveProgress: 0,
      });
    }
  }

  // --- Переменные состояния игрока ---
  let playerIsMoving = false;
  let playerMoveStartX = 0, playerMoveStartY = 0;
  let playerMoveTargetX = 0, playerMoveTargetY = 0;
  let playerMoveProgress = 0;
  const MOVE_SPEED = 0.1; // скорость перемещения (доля за кадр)
  let playerDirection = "down";
  let playerAnimFrame = 0;
  let playerAnimTimer = 0;

  // --- Инвентарь и прогресс ---
  let keysCollected = 0;
  const requiredKeys = 3; // нужно для открытия входа (gid 5292)

  // Функция сбора предмета на клетке (col, row)
  function collectItemAt(col: number, row: number) {
    const index = items.findIndex(item => item.col === col && item.row === row);
    if (index === -1) return;
    const item = items[index];
    if (item.type === 'key') {
      keysCollected++;
      console.log(`Ключей: ${keysCollected}`);
      if (keysCollected === requiredKeys) {
        console.log('Все ключи собраны! Можно открыть дверь.');
        // TODO: изменить тайл входа (gid 5292) на проходимый
      }
    } else if (item.type === 'helth') {
      console.log('Зелье здоровья!');
      // TODO: увеличить здоровье игрока
    }
    worldContainer.removeChild(item.sprite);
    items.splice(index, 1);
  }

  // --- Пошаговая логика врагов ---
  let enemiesMoving = false; // флаг, что сейчас ход врагов

  // Запуск хода врагов (вызывается после завершения движения игрока)
  function startEnemyTurns() {
    enemiesMoving = true;
    for (const enemy of enemies) {
      if (enemy.health <= 0) continue;

      const playerCol = Math.floor(playerSprite.x / tileSize);
      const playerRow = Math.floor(playerSprite.y / tileSize);
      const dist = Math.abs(enemy.col - playerCol) + Math.abs(enemy.row - playerRow);

      let targetCol = enemy.col;
      let targetRow = enemy.row;

      if (dist <= 3) {
        // Двигаемся к игроку (по одной оси)
        const dx = Math.sign(playerCol - enemy.col);
        const dy = Math.sign(playerRow - enemy.row);
        if (dx !== 0 && (Math.abs(dx) >= Math.abs(dy) || dy === 0)) {
          targetCol = enemy.col + dx;
        } else if (dy !== 0) {
          targetRow = enemy.row + dy;
        }
      } else {
        // Вне радиуса – пока стоим (можно добавить случайное блуждание)
        continue;
      }

      // Проверяем, можно ли встать на целевую клетку
      if (!isWalkable(targetCol, targetRow)) continue;
      // Проверяем, не занята ли клетка другим врагом
      const occupied = enemies.some(e => e !== enemy && e.col === targetCol && e.row === targetRow && e.health > 0);
      if (occupied) continue;

      // Запускаем движение врага
      enemy.moveStartX = enemy.sprite.x;
      enemy.moveStartY = enemy.sprite.y;
      enemy.moveTargetX = targetCol * tileSize + tileSize / 2;
      enemy.moveTargetY = targetRow * tileSize + tileSize / 2;
      enemy.moveProgress = 0;
      enemy.isMoving = true;
      // Сразу обновляем логические координаты (клетка считается занятой)
      enemy.col = targetCol;
      enemy.row = targetRow;
    }
  }

  // Проверка столкновений игрока с врагами (после завершения их хода)
  function checkEnemyCollisions() {
    const playerCol = Math.floor(playerSprite.x / tileSize);
    const playerRow = Math.floor(playerSprite.y / tileSize);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.health <= 0) continue;
      if (enemy.col === playerCol && enemy.row === playerRow) {
        console.log('Враг атакован!');
        worldContainer.removeChild(enemy.sprite);
        enemies.splice(i, 1);
        // TODO: нанести урон игроку
      }
    }
  }

  // --- Управление игроком ---
  function startPlayerMove(dx: number, dy: number) {
    if (playerIsMoving || enemiesMoving) return;

    const currentCol = Math.floor(playerSprite.x / tileSize);
    const currentRow = Math.floor(playerSprite.y / tileSize);
    const newCol = currentCol + dx;
    const newRow = currentRow + dy;

    if (!isWalkable(newCol, newRow)) return;

    // Определяем направление
    if (dx === -1) playerDirection = "left";
    else if (dx === 1) playerDirection = "right";
    else if (dy === -1) playerDirection = "up";
    else if (dy === 1) playerDirection = "down";

    playerMoveStartX = playerSprite.x;
    playerMoveStartY = playerSprite.y;
    playerMoveTargetX = newCol * tileSize + tileSize / 2;
    playerMoveTargetY = newRow * tileSize + tileSize / 2;
    playerMoveProgress = 0;
    playerIsMoving = true;
    playerAnimFrame = 0;
    playerAnimTimer = 0;
  }

  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.code.startsWith("Arrow")) {
      e.preventDefault();
      switch (e.code) {
        case "ArrowLeft": startPlayerMove(-1, 0); break;
        case "ArrowRight": startPlayerMove(1, 0); break;
        case "ArrowUp": startPlayerMove(0, -1); break;
        case "ArrowDown": startPlayerMove(0, 1); break;
      }
    }
  });

  // --- Камера ---
  const mapWidth = groundLayer.width * tileSize;
  const mapHeight = groundLayer.height * tileSize;
  const screenWidth = app.screen.width;
  const screenHeight = app.screen.height;

  function updateCamera() {
    const targetX = screenWidth / 2 - playerSprite.x;
    const targetY = screenHeight / 2 - playerSprite.y;
    const minX = screenWidth - mapWidth;
    const maxX = 0;
    const minY = screenHeight - mapHeight;
    const maxY = 0;
    worldContainer.x = Math.max(minX, Math.min(maxX, targetX));
    worldContainer.y = Math.max(minY, Math.min(maxY, targetY));
  }

  // --- Игровой цикл (ticker) ---
  app.ticker.add(() => {
    // 1. Движение игрока
    if (playerIsMoving) {
      playerMoveProgress += MOVE_SPEED;
      if (playerMoveProgress >= 1) {
        playerMoveProgress = 1;
        playerIsMoving = false;
        playerSprite.texture = playerTextures[playerDirection][1]; // кадр стояния
        playerAnimFrame = 0;

        // Сбор предмета на новой клетке
        const newCol = Math.floor(playerSprite.x / tileSize);
        const newRow = Math.floor(playerSprite.y / tileSize);
        collectItemAt(newCol, newRow);

        // Запускаем ход врагов
        startEnemyTurns();
      } else {
        playerAnimTimer++;
        if (playerAnimTimer >= 5) {
          playerAnimTimer = 0;
          playerAnimFrame = (playerAnimFrame + 1) % 3;
          playerSprite.texture = playerTextures[playerDirection][playerAnimFrame];
        }
      }
      // Интерполяция позиции
      playerSprite.x = playerMoveStartX + (playerMoveTargetX - playerMoveStartX) * playerMoveProgress;
      playerSprite.y = playerMoveStartY + (playerMoveTargetY - playerMoveStartY) * playerMoveProgress;
    }

    // 2. Движение врагов
    if (enemiesMoving) {
      let anyMoving = false;
      for (const enemy of enemies) {
        if (enemy.health <= 0) continue;
        if (enemy.isMoving) {
          anyMoving = true;
          enemy.moveProgress += MOVE_SPEED;
          if (enemy.moveProgress >= 1) {
            enemy.moveProgress = 1;
            enemy.isMoving = false;
          }
          enemy.sprite.x = enemy.moveStartX + (enemy.moveTargetX - enemy.moveStartX) * enemy.moveProgress;
          enemy.sprite.y = enemy.moveStartY + (enemy.moveTargetY - enemy.moveStartY) * enemy.moveProgress;
        }
      }
      if (!anyMoving) {
        enemiesMoving = false;
        checkEnemyCollisions(); // проверяем бой после окончания хода всех врагов
      }
    }

    // 3. Камера всегда обновляется
    updateCamera();
  });
})();