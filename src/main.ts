import {
  Application,
  Assets,
  Sprite,
  Texture,
  Rectangle,
  Container,
} from "pixi.js";

interface TiledLayer {
  id: number;
  name: string;
  data: number[];
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  x: number;
  y: number;
}

(async () => {
  const app = new Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Загружаем карту, тайлсет и спрайт персонажа
  const [mapData, tilesetTexture, heroTexture] = await Promise.all([
    fetch("/assets/map.json").then((res) => res.json()),
    Assets.load("/assets/tileset.png"),
    Assets.load("/assets/hero.png"),
  ]);

  const tileSize = mapData.tilewidth; // 32
  const tilesPerRow = Math.floor(tilesetTexture.width / tileSize);

  const groundLayer = mapData.layers.find(
    (layer: TiledLayer) => layer.id === 1,
  );
  if (!groundLayer) throw new Error('Слой "земля" не найден');

  // Создаём контейнер для всего мира (карта + персонаж)
  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  // Контейнер для карты
  const mapContainer = new Container();
  worldContainer.addChild(mapContainer);

  // Отрисовка карты
  for (let row = 0; row < groundLayer.height; row++) {
    for (let col = 0; col < groundLayer.width; col++) {
      const gid = groundLayer.data[row * groundLayer.width + col];
      if (gid === 0) continue;

      const localTileId = gid - 1;
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

  // --- Подготовка анимации персонажа ---
  const frameWidth = 32;
  const frameHeight = 36;
  const directions = ["up", "right", "down", "left"];
  const playerTextures: { [key: string]: Texture[] } = {
    down: [],
    left: [],
    right: [],
    up: [],
  };

  for (let row = 0; row < 4; row++) {
    const dir = directions[row];
    for (let col = 0; col < 3; col++) {
      const frame = new Texture({
        source: heroTexture.source,
        frame: new Rectangle(
          col * frameWidth,
          row * frameHeight,
          frameWidth,
          frameHeight,
        ),
      });
      playerTextures[dir].push(frame);
    }
  }

  // Создаём спрайт персонажа
  const playerSprite = new Sprite(playerTextures.down[0]);
  playerSprite.anchor.set(0.5);
  const startCol = 3;
  const startRow = 1;
  playerSprite.x = startCol * tileSize + tileSize / 2;
  playerSprite.y = startRow * tileSize + tileSize / 2;
  worldContainer.addChild(playerSprite);

  // --- Данные о проходимости ---
  const wayGids = new Set([5725, 6593, 6597, 6841, 8390, 8774]);

  function isWalkable(col: number, row: number): boolean {
    if (
      col < 0 ||
      col >= groundLayer.width ||
      row < 0 ||
      row >= groundLayer.height
    )
      return false;
    const gid = groundLayer.data[row * groundLayer.width + col];
    return wayGids.has(gid);
  }

  // --- Переменные для движения и анимации ---
  let isMoving = false;
  let moveStartX = 0,
    moveStartY = 0;
  let moveTargetX = 0,
    moveTargetY = 0;
  let moveProgress = 0;
  const MOVE_SPEED = 0.1;

  let currentDirection = "down"; // текущее направление взгляда
  let animationFrame = 1; // текущий кадр анимации (0-2)
  let animationTimer = 0; // счётчик для смены кадров

  // Функция запуска движения
  function startMove(dx: number, dy: number) {
    if (isMoving) return;

    const currentCol = Math.floor(playerSprite.x / tileSize);
    const currentRow = Math.floor(playerSprite.y / tileSize);
    const newCol = currentCol + dx;
    const newRow = currentRow + dy;

    if (!isWalkable(newCol, newRow)) return;

    // Определяем направление
    if (dx === -1) currentDirection = "left";
    else if (dx === 1) currentDirection = "right";
    else if (dy === -1) currentDirection = "up";
    else if (dy === 1) currentDirection = "down";

    moveStartX = playerSprite.x;
    moveStartY = playerSprite.y;
    moveTargetX = newCol * tileSize + tileSize / 2;
    moveTargetY = newRow * tileSize + tileSize / 2;
    moveProgress = 0;
    isMoving = true;
    animationFrame = 0; // сброс анимации на первый кадр шага
  }

  // Обработка клавиш
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.code.startsWith("Arrow")) {
      e.preventDefault();
      switch (e.code) {
        case "ArrowLeft":
          startMove(-1, 0);
          break;
        case "ArrowRight":
          startMove(1, 0);
          break;
        case "ArrowUp":
          startMove(0, -1);
          break;
        case "ArrowDown":
          startMove(0, 1);
          break;
      }
    }
  });

  // Камера: ограничители
  const mapWidth = groundLayer.width * tileSize;
  const mapHeight = groundLayer.height * tileSize;
  const screenWidth = app.screen.width;
  const screenHeight = app.screen.height;

  // Функция обновления камеры
  function updateCamera() {
    // Целевая позиция мира: центрируем игрока
    const targetX = screenWidth / 2 - playerSprite.x;
    const targetY = screenHeight / 2 - playerSprite.y;

    // Ограничиваем, чтобы не показывать пустоту за краями карты
    const minX = screenWidth - mapWidth; // максимальный сдвиг влево (отрицательный)
    const maxX = 0; // максимальный сдвиг вправо (0)
    const minY = screenHeight - mapHeight;
    const maxY = 0;

    worldContainer.x = Math.max(minX, Math.min(maxX, targetX));
    worldContainer.y = Math.max(minY, Math.min(maxY, targetY));
  }

  // Игровой цикл
  app.ticker.add(() => {
    if (isMoving) {
      moveProgress += MOVE_SPEED;
      if (moveProgress >= 1) {
        moveProgress = 1;
        isMoving = false;
        // По окончании движения ставим первый кадр стояния (или оставляем последний)
        playerSprite.texture = playerTextures[currentDirection][1];
        animationFrame = 0;
        animationTimer = 0;
      } else {
        // Анимация шагов: меняем кадр каждые 5 тиков
        animationTimer++;
        if (animationTimer >= 5) {
          animationTimer = 0;
          animationFrame = (animationFrame + 1) % 3;
          // Во время движения используем кадры
          playerSprite.texture =
            playerTextures[currentDirection][animationFrame];
        }
      }
      // Интерполяция позиции
      playerSprite.x = moveStartX + (moveTargetX - moveStartX) * moveProgress;
      playerSprite.y = moveStartY + (moveTargetY - moveStartY) * moveProgress;
    } else {
      // Если не двигаемся
    }

    // Обновляем камеру
    updateCamera();
  });
})();
