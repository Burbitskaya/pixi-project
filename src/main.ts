import { Application, Assets, Texture, Rectangle } from 'pixi.js';
import { TileMap } from './TileMap';
import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { ItemManager } from './ItemManager';
import { HUD } from './HUD';
import { TiledMap, TiledObjectLayer } from './types';

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

  // Инициализация карты
  const tileMap = new TileMap(mapData, tilesetTexture, firstgid);
  app.stage.addChild(tileMap.container);

  // Создание игрока и его текстур
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
  const player = new Player(playerTextures, tileMap, 3, 1);
  tileMap.container.addChild(player.sprite); 
  // Создание предметов
  const objectLayer = mapData.layers.find((layer): layer is TiledObjectLayer => layer.name === 'object');
  const itemManager = new ItemManager(objectLayer, tilesetTexture, firstgid, tileMap.tileSize, tileMap.container);

  // Создание врагов
  const warriorLayer = mapData.layers.find((layer): layer is TiledObjectLayer => layer.name === 'wariors');
  const enemyManager = new EnemyManager(warriorLayer, tilesetTexture, firstgid, tileMap.tileSize, tileMap.container, tileMap);

  // HUD
  const keyGid = 921;
  const keyLocalId = keyGid - firstgid;
  const tilesPerRow = Math.floor(tilesetTexture.width / tileMap.tileSize);
  const keyTileX = (keyLocalId % tilesPerRow) * tileMap.tileSize;
  const keyTileY = Math.floor(keyLocalId / tilesPerRow) * tileMap.tileSize;
  const keyTexture = new Texture({
    source: tilesetTexture.source,
    frame: new Rectangle(keyTileX, keyTileY, tileMap.tileSize, tileMap.tileSize),
  });
  const hud = new HUD(app, keyTexture, 3);
  app.stage.addChild(hud.container);

  // Управление клавишами
  window.addEventListener("keydown", (e) => player.setKey(e.code, true));
  window.addEventListener("keyup", (e) => player.setKey(e.code, false));

  // Переменные для инвентаря
  let keysCollected = 0;

  // Камера (если используем worldContainer)
  const mapWidth = tileMap.groundLayer.width * tileMap.tileSize;
  const mapHeight = tileMap.groundLayer.height * tileMap.tileSize;
  const screenWidth = app.screen.width;
  const screenHeight = app.screen.height;

  function updateCamera() {
    const targetX = screenWidth / 2 - player.sprite.x;
    const targetY = screenHeight / 2 - player.sprite.y;
    const minX = screenWidth - mapWidth;
    const maxX = 0;
    const minY = screenHeight - mapHeight;
    const maxY = 0;
    tileMap.container.x = Math.round(Math.max(minX, Math.min(maxX, targetX)));
    tileMap.container.y = Math.round(Math.max(minY, Math.min(maxY, targetY)));
  }

  // Игровой цикл
  app.ticker.add(() => {
    player.update();

    enemyManager.update(player);

    const collected = itemManager.collectAt(player.col, player.row);
    if (collected) {
      if (collected.type === 'key') {
        keysCollected++;
        hud.updateKeys(keysCollected);
        if (keysCollected === 3) console.log('Все ключи собраны!');
      } else if (collected.type === 'helth') {
        // лечение
      }
    }

    enemyManager.checkCollisions(player, (health) => {
      hud.updateHealth(health);
    });

    updateCamera();
  });
})();