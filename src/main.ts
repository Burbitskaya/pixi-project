import { Application, Assets, Texture, Rectangle, Graphics } from 'pixi.js';
import { TileMap } from './TileMap';
import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { ItemManager } from './ItemManager';
import { HUD } from './HUD';
import { TiledMap, TiledLayer, TiledObjectLayer, TiledGroup } from './types';

(async () => {
  const app = new Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Загрузка ресурсов
  const [mapData, tilesetTexture, heroTexture] = await Promise.all([
    fetch("/assets/map.json").then((res) => res.json()) as Promise<TiledMap>,
    Assets.load("/assets/tileset.png"),
    Assets.load("/assets/hero.png"),
  ]);

  const firstgid = mapData.tilesets[0]?.firstgid ?? 1;
  const tileSize = mapData.tilewidth;

  // Извлекаем все группы уровней 
  const levelGroups = mapData.layers
    .filter((layer): layer is TiledGroup => layer.type === 'group')
    .sort((a, b) => parseInt(a.name) - parseInt(b.name)); // сортируем по номеру

  if (levelGroups.length === 0) throw new Error('No level groups found');
  let currentLevelIndex = 0; // начинаем с первого

  // --- Подготовка текстур игрока ---
  const frameWidth = 32;
  const frameHeight = 36;
  const directions = ["up", "right", "down", "left"];
  const playerTextures: Record<string, Texture[]> = { down: [], left: [], right: [], up: [] };
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

  // --- HUD ---
  const keyGid = 921;
  const keyLocalId = keyGid - firstgid;
  const tilesPerRow = Math.floor(tilesetTexture.width / tileSize);
  const keyTileX = (keyLocalId % tilesPerRow) * tileSize;
  const keyTileY = Math.floor(keyLocalId / tilesPerRow) * tileSize;
  const keyTexture = new Texture({
    source: tilesetTexture.source,
    frame: new Rectangle(keyTileX, keyTileY, tileSize, tileSize),
  });
  const hud = new HUD(app, keyTexture, 3);

  // --- Функция загрузки уровня по индексу ---
  function loadLevel(levelIndex: number, startCol = 3, startRow = 1) {
  const group = levelGroups[levelIndex];
  if (!group) throw new Error(`Level ${levelIndex} not found`);

  const groundLayer = group.layers.find((l): l is TiledLayer => l.name === 'land');
  const objectLayer = group.layers.find((l): l is TiledObjectLayer => l.name === 'objects');
  const enemyLayer = group.layers.find((l): l is TiledObjectLayer => l.name === 'enemies');
  if (!groundLayer) throw new Error('No land layer in level');

  // Удаляем старую карту, если есть
  if (currentTileMap) {
    app.stage.removeChild(currentTileMap.container);
  }

  // Создаём новую карту
  const newTileMap = new TileMap(groundLayer, tilesetTexture, firstgid, tileSize);
  app.stage.addChild(newTileMap.container);

  // Создаём новые менеджеры
  const newItemManager = new ItemManager(objectLayer, tilesetTexture, firstgid, tileSize, newTileMap.container);
  const newEnemyManager = new EnemyManager(enemyLayer, tilesetTexture, firstgid, tileSize, newTileMap.container, newTileMap);

  // Переносим игрока
  if (player) {
    player.sprite.parent?.removeChild(player.sprite);
    newTileMap.container.addChild(player.sprite);
    player.setTileMap(newTileMap);
    player.sprite.x = startCol * tileSize + tileSize / 2;
    player.sprite.y = startRow * tileSize + tileSize / 2;
  }

  // Обновляем глобальные ссылки
  currentTileMap = newTileMap;
  currentItemManager = newItemManager;
  currentEnemyManager = newEnemyManager;

  // Сбрасываем ключи и обновляем HUD
  keysCollected = 0;
  hud.updateKeys(0);
  hud.setLevel(`lvl ${group.name}`);

  // Добавляем HUD на сцену, если ещё не добавлен, и поднимаем наверх
  if (!hud.container.parent) {
    app.stage.addChild(hud.container);
  }
  app.stage.setChildIndex(hud.container, app.stage.children.length - 1);
}
  // --- Инициализация переменных, которые будут перезаписываться ---
  let currentTileMap: TileMap;
  let currentItemManager: ItemManager;
  let currentEnemyManager: EnemyManager;
  let player: Player;
  let keysCollected = 0;

  // Создаём игрока (пока без карты, карту загрузим ниже)
  player = new Player(playerTextures, null as any, 3, 1, tileSize); // tileMap будет назначен в loadLevel

  // Загружаем первый уровень
  loadLevel(0, 3, 1); // стартовая клетка (3,1)

  // --- Добавляем HUD на сцену ---
  app.stage.addChild(hud.container);
  // Перемещаем HUD на самый верх 
  app.stage.setChildIndex(hud.container, app.stage.children.length - 1);

  // --- Эффекты атаки и кулдаун ---
  const attackEffects: { graphic: Graphics; timer: number }[] = [];
  let attackCooldown = 0;
  const ATTACK_COOLDOWN_FRAMES = 20;

  // --- Управление ---
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.code.startsWith("Arrow")) {
      e.preventDefault();
      player.setKey(e.code, true);
    }
    if (e.code === "Space" && attackCooldown <= 0) {
      e.preventDefault();
      const attackCell = player.getAttackCell();
      if (attackCell) {
        const hit = currentEnemyManager.attackEnemyAt(attackCell.col, attackCell.row, 1);
        const effect = new Graphics()
          .rect(0, 0, tileSize, tileSize)
          .fill({ color: hit ? 0xff0000 : 0xaaaaaa, alpha: 0.6 });
        effect.x = attackCell.col * tileSize;
        effect.y = attackCell.row * tileSize;
        currentTileMap.container.addChild(effect);
        attackEffects.push({ graphic: effect, timer: 10 });
        attackCooldown = ATTACK_COOLDOWN_FRAMES;
      }
    }
  });

  window.addEventListener("keyup", (e: KeyboardEvent) => {
    if (e.code.startsWith("Arrow")) {
      player.setKey(e.code, false);
    }
  });

  // --- Функция переключения на следующий уровень ---
  function goToNextLevel() {
    const nextIndex = currentLevelIndex + 1;
    if (nextIndex < levelGroups.length) {
      currentLevelIndex = nextIndex;
      loadLevel(nextIndex, 3, 1); // стартовая позиция 
    } else {
      location.reload();
    }
  }

  // --- Камера (используем актуальные размеры экрана) ---
  function updateCamera() {
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;
    const mapWidth = currentTileMap.groundLayer.width * tileSize;
    const mapHeight = currentTileMap.groundLayer.height * tileSize;
    const targetX = screenWidth / 2 - player.sprite.x;
    const targetY = screenHeight / 2 - player.sprite.y;
    const minX = screenWidth - mapWidth;
    const maxX = 0;
    const minY = screenHeight - mapHeight;
    const maxY = 0;
    currentTileMap.container.x = Math.round(Math.max(minX, Math.min(maxX, targetX)));
    currentTileMap.container.y = Math.round(Math.max(minY, Math.min(maxY, targetY)));
  }

  // --- Игровой цикл ---
  app.ticker.add(() => {
    player.update();
    currentEnemyManager.update(player);

    // Сбор предметов
const itemAtPlayer = currentItemManager.items.find(item => item.col === player.col && item.row === player.row);
if (itemAtPlayer) {
  if (itemAtPlayer.type === 'key') {
    // Удаляем ключ
    currentItemManager.items = currentItemManager.items.filter(i => i !== itemAtPlayer);
    currentTileMap.container.removeChild(itemAtPlayer.sprite);
    keysCollected++;
    hud.updateKeys(keysCollected);
  } else if (itemAtPlayer.type === 'helth') {
    // Зелье забираем только если здоровье не полное
    if (player.health < 3) {
      currentItemManager.items = currentItemManager.items.filter(i => i !== itemAtPlayer);
      currentTileMap.container.removeChild(itemAtPlayer.sprite);
      player.health = Math.min(player.health + 1, 3);
      hud.updateHealth(player.health);
    }
    // Если здоровье полное, ничего не делаем — предмет остаётся
  }
}

    // Проверка перехода на следующий уровень
    if (keysCollected === 3) {
      const gid = currentTileMap.getGidAt(player.col, player.row);
      if (gid === 3969) { // тайл входа
        goToNextLevel();
        return; // пропускаем остальную логику этого кадра
      }
    }

    // Столкновения с врагами
    currentEnemyManager.checkCollisions(player, (health) => {
      hud.updateHealth(health);
      if (health <= 0) {
        location.reload(); // смерть -> перезагрузка
      }
    });

    // Обновление эффектов атаки
    if (attackCooldown > 0) attackCooldown--;
    for (let i = attackEffects.length - 1; i >= 0; i--) {
      attackEffects[i].timer--;
      if (attackEffects[i].timer <= 0) {
        currentTileMap.container.removeChild(attackEffects[i].graphic);
        attackEffects.splice(i, 1);
      }
    }

    updateCamera();
  });
})();