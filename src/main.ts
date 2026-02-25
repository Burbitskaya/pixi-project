import {
  Application,
  Assets,
  Sprite,
  Texture,
  Rectangle,
  Graphics,
  Container,
  Text
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


//-----------HUD----------------------------
const hudContainer = new Container();
app.stage.addChild(hudContainer);

const hudBackground = new Graphics();
hudContainer.addChild(hudBackground); 

// Создаём элементы интерфейса
const titleText = new Text({
  text: 'Dungeon Crawler',
  style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' }
});
hudContainer.addChild(titleText);

const levelText = new Text({
  text: 'lvl 1',
  style: { fill: '#ffffff', fontSize: 20 }
});
hudContainer.addChild(levelText);

// Иконка ключа (из тайлсета)
const keyGid = 921;
const keyLocalId = keyGid - firstgid;
const keyTileX = (keyLocalId % tilesPerRow) * tileSize;
const keyTileY = Math.floor(keyLocalId / tilesPerRow) * tileSize;
const keyTexture = new Texture({
  source: tilesetTexture.source,
  frame: new Rectangle(keyTileX, keyTileY, tileSize, tileSize),
});
const keyIcon = new Sprite(keyTexture);
keyIcon.width = 40;
keyIcon.height = 40;
hudContainer.addChild(keyIcon);

const keyText = new Text({
  text: '0/3',
  style: { fill: '#ffffff', fontSize: 20 }
});
hudContainer.addChild(keyText);

// Сердечки (графика)
function createHeartSprite(size: number): Graphics {
  const heart = new Graphics();
  
  // Масштабируем координаты под нужный размер
  const scale = size / 30; // базовый размер фигуры ~30px
  
  heart.poly([
    { x: 15 * scale, y: 5 * scale },  // верхушка левой доли
    { x: 10 * scale, y: 0 * scale },  // левая верхняя точка
    { x: 5 * scale, y: 5 * scale },   // левый изгиб
    { x: 5 * scale, y: 10 * scale },  // левая середина
    { x: 15 * scale, y: 20 * scale }, // нижний кончик
    { x: 25 * scale, y: 10 * scale }, // правая середина
    { x: 25 * scale, y: 5 * scale },  // правый изгиб
    { x: 20 * scale, y: 0 * scale },  // правая верхняя точка
    { x: 15 * scale, y: 5 * scale },  // замыкание
  ]).fill(0xff0000);
  
  return heart;
}

const hearts: Graphics[] = [];
const heartSize = 24;
for (let i = 0; i < 3; i++) {
  const heart = createHeartSprite(heartSize);
  heart.x = 10 + i * (heartSize + 5);
  heart.y = 70;
  hudContainer.addChild(heart);
  hearts.push(heart);
}

// Функция для обновления позиций HUD при изменении размера окна
function updateHUDPositions() {
  const padding = 10;
  const screenWidth = app.screen.width;

  // Левая группа: заголовок и уровень
  titleText.x = padding;
  titleText.y = padding;
  
  levelText.x = titleText.x + 230; // фиксированный отступ, можно подогнать
  levelText.y = padding;

  // Правая группа: ключ и сердечки
  // Общая ширина правой группы
  const heartsWidth = hearts.length * (heartSize + 5) - 5;
  const keyWidth = keyIcon.width + 5 + keyText.width;
  const rightGroupWidth = heartsWidth + keyWidth + 30;
  let rightGroupX = screenWidth - padding - rightGroupWidth;

  // Позиционируем ключ
  keyIcon.x = rightGroupX;
  keyIcon.y = padding + (titleText.height - keyIcon.height) / 2;
  keyText.x = keyIcon.x + keyIcon.width + 5;
  keyText.y = keyIcon.y + (keyIcon.height - keyText.height) / 2;

  // Позиционируем сердечки справа от ключа
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].x = keyText.x + keyText.width + 20 + i * (heartSize + 5);
    hearts[i].y = padding + (titleText.height - heartSize);
  }

 // Вычисляем высоту HUD (от верхнего края до нижнего края самого нижнего элемента)
  const maxY = Math.max(
    titleText.y + titleText.height,
    levelText.y + levelText.height,
    keyIcon.y + keyIcon.height,
    keyText.y + keyText.height,
    ...hearts.map(h => h.y + heartSize)
  );
  const hudHeight = maxY ; // добавляем нижний отступ

   // Обновляем фон: прямоугольник от верхнего края экрана до нижней границы HUD
  hudBackground.clear();
  hudBackground.rect(0, 0, screenWidth, hudHeight);
  hudBackground.fill({ color: 0x000000, alpha: 0.6 });
}

// Вызываем при первой отрисовке и при изменении размера окна
updateHUDPositions();
window.addEventListener('resize', updateHUDPositions);
//----------------------------------------------------------------

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
  let playerHealth = 3; // начальное здоровье
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
      keyText.text = `${keysCollected}/${requiredKeys}`;
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
           playerHealth--;
    // Обновляем видимость сердец
    for (let i = 0; i < hearts.length; i++) {
      hearts[i].visible = i < playerHealth;
    }
    if (playerHealth <= 0) {
      console.log('Game Over');
    }
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