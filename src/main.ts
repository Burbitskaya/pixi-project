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

  // Извлекаем группы уровней
  const groups = mapData.layers.filter((layer): layer is TiledGroup => layer.type === 'group');
  const level1Group = groups.find(g => g.name === '1');
  const level2Group = groups.find(g => g.name === '2');
  if (!level1Group) throw new Error('Level 1 group not found');

  // --- Подготовка текстур игрока (один раз) ---
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
 

  // --- Инициализация первого уровня (карта, предметы, враги) ---
  const groundLayer = level1Group.layers.find((l): l is TiledLayer => l.name === 'land');
  const objectLayer = level1Group.layers.find((l): l is TiledObjectLayer => l.name === 'objects');
  const enemyLayer = level1Group.layers.find((l): l is TiledObjectLayer => l.name === 'enemies');
  if (!groundLayer) throw new Error('No land layer in level 1');

  // Создаём карту первого уровня
  let currentTileMap = new TileMap(groundLayer, tilesetTexture, firstgid, tileSize);
  app.stage.addChild(currentTileMap.container);

 app.stage.addChild(hud.container);

  // Создаём менеджеры предметов и врагов
  let currentItemManager = new ItemManager(objectLayer, tilesetTexture, firstgid, tileSize, currentTileMap.container);
  let currentEnemyManager = new EnemyManager(enemyLayer, tilesetTexture, firstgid, tileSize, currentTileMap.container, currentTileMap);

  // --- Создаём игрока (теперь карта есть) ---
  const player = new Player(playerTextures, currentTileMap, 3, 1);
  currentTileMap.container.addChild(player.sprite);

  // --- Переменные состояния ---
  let keysCollected = 0;

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

  // --- Функция переключения уровня ---
  function switchLevel(group: TiledGroup) {
    const nextGround = group.layers.find((l): l is TiledLayer => l.name === 'land');
    const nextObject = group.layers.find((l): l is TiledObjectLayer => l.name === 'objects');
    const nextEnemy = group.layers.find((l): l is TiledObjectLayer => l.name === 'enemies');
    if (!nextGround) throw new Error('No land layer in target level');

    // Удаляем старую карту со сцены
    app.stage.removeChild(currentTileMap.container);

    // Создаём новую карту
    const newTileMap = new TileMap(nextGround, tilesetTexture, firstgid, tileSize);
    app.stage.addChild(newTileMap.container);

    // Создаём новые менеджеры
    const newItemManager = new ItemManager(nextObject, tilesetTexture, firstgid, tileSize, newTileMap.container);
    const newEnemyManager = new EnemyManager(nextEnemy, tilesetTexture, firstgid, tileSize, newTileMap.container, newTileMap);

    // Переносим игрока в новый контейнер
    player?.sprite?.parent?.removeChild(player.sprite);
    newTileMap.container.addChild(player.sprite);
    player.setTileMap(newTileMap);

    // Обновляем глобальные ссылки
    currentTileMap = newTileMap;
    currentItemManager = newItemManager;
    currentEnemyManager = newEnemyManager;

    // Сбрасываем ключи и обновляем HUD
    keysCollected = 0;
    hud.updateKeys(0);
    hud.setLevel(`lvl ${group.name}`);
  }

  // --- Камера ---
  const screenWidth = app.screen.width;
  const screenHeight = app.screen.height;

  function updateCamera() {
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
    const collected = currentItemManager.collectAt(player.col, player.row);
    if (collected) {
      if (collected.type === 'key') {
        keysCollected++;
        hud.updateKeys(keysCollected);
       
      } else if (collected.type === 'helth') {
        player.health = Math.min(player.health + 1, 3);
        hud.updateHealth(player.health);
      }
    }

    // Проверка перехода на следующий уровень
    if (keysCollected === 3) {
      const gid = currentTileMap.getGidAt(player.col, player.row);
      if (gid === 3969) { // тайл входа
        if (level2Group) {
          switchLevel(level2Group);
        } else {
          // Если второго уровня нет, перезагружаем страницу (возврат на первый)
          location.reload();
        }
        return; // пропускаем остальную логику этого кадра
      }
    }

    // Столкновения с врагами
    currentEnemyManager.checkCollisions(player, (health) => {
      hud.updateHealth(health);
      if (health <= 0) {
        location.reload(); /
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