import { Application, Assets, Sprite, Texture, Rectangle, Container, Graphics } from 'pixi.js';

(async () => {
    const app = new Application();
    await app.init({ background: '#1099bb', resizeTo: window });
    document.getElementById('pixi-container')!.appendChild(app.canvas);

    // Загружаем карту и текстуры
    const [mapData, tilesetTexture] = await Promise.all([
        fetch('/assets/map.json').then(res => res.json()),
        Assets.load('/assets/tileset.png')
    ]);

    const tileSize = mapData.tilewidth;
    const tilesPerRow = Math.floor(tilesetTexture.width / tileSize);

    const groundLayer = mapData.layers.find((layer: { id: number; }) => layer.id === 1);
    if (!groundLayer) throw new Error('Слой "земля" не найден');
    console.log(mapData);
    const mapContainer = new Container();
    app.stage.addChild(mapContainer);

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
                frame: new Rectangle(tileX, tileY, tileSize, tileSize)
            });

            const tileSprite = new Sprite(tileTexture);
            tileSprite.x = col * tileSize;
            tileSprite.y = row * tileSize;
            mapContainer.addChild(tileSprite);
        }
    }

    // Персонаж (загрузите свой спрайт или оставьте красный квадрат для теста)
   // const player = new Sprite(await Assets.load('/assets/hero.png'));
    // Если нет картинки, можно использовать Graphics, как раньше:
     const player = new Graphics().rect(0,0,30,30).fill(0xff0000);
  //  player.anchor.set(0.5);
    const startCol = 3;
    const startRow = 1;
    player.x = startCol * tileSize ;
    player.y = startRow * tileSize ;
    app.stage.addChild(player);

    // Непроходимые тайлы (заполните свой список)
    const wayGids = new Set([5725,6593,6597,6841,8390,8774]);

    function isWalkable(col: number, row: number): boolean {
        if (col < 0 || col >= groundLayer.width || row < 0 || row >= groundLayer.height) return false;
        const gid = groundLayer.data[row * groundLayer.width + col];
        console.log(gid,wayGids.has(gid));
        return wayGids.has(gid);
    }

    // --- Переменные для плавного движения ---
    let isMoving = false;
    let moveStartX = 0, moveStartY = 0;   // начальные координаты (в пикселях)
    let moveTargetX = 0, moveTargetY = 0; // целевые координаты (в пикселях)
    let moveProgress = 0;                  // от 0 до 1
    const MOVE_SPEED = 0.1;                // приращение прогресса за кадр (чем больше, тем быстрее)

    // Функция запуска движения
    function startMove(dx: number, dy: number) {
        if (isMoving) return; // уже движется – игнорируем

        // Текущая клетка (округляем координаты персонажа до клетки)
        const currentCol = Math.floor(player.x / tileSize);
        const currentRow = Math.floor(player.y / tileSize);
        const newCol = currentCol + dx;
        const newRow = currentRow + dy;

        if (!isWalkable(newCol, newRow)) return;

        // Запоминаем начало и цель (центры клеток)
        moveStartX = player.x;
        moveStartY = player.y;
        moveTargetX = newCol * tileSize + tileSize / 2;
        moveTargetY = newRow * tileSize + tileSize / 2;
        moveProgress = 0;
        isMoving = true;
    }

    // Обработка клавиш (теперь они только инициируют движение)
    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.code.startsWith('Arrow')) {
            e.preventDefault();
            switch (e.code) {
                case 'ArrowLeft':  startMove(-1, 0); break;
                case 'ArrowRight': startMove(1, 0); break;
                case 'ArrowUp':    startMove(0, -1); break;
                case 'ArrowDown':  startMove(0, 1); break;
            }
        }
    });

    // Игровой цикл (ticker)
    app.ticker.add(() => {
        if (isMoving) {
            // Увеличиваем прогресс
            moveProgress += MOVE_SPEED;
            if (moveProgress >= 1) {
                // Движение завершено
                moveProgress = 1;
                isMoving = false;
            }
            // Интерполяция позиции
            player.x = moveStartX + (moveTargetX - moveStartX) * moveProgress;
            player.y = moveStartY + (moveTargetY - moveStartY) * moveProgress;
        }
    });

    // Небольшая оптимизация: если персонаж стоит ровно в центре клетки, 
    // но из-за погрешностей может немного отклоняться. Можно принудительно 
    // устанавливать точную позицию после остановки.
})();