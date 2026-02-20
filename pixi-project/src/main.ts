import { Application, Graphics, Text } from 'pixi.js';

// Создаём приложение
const app = new Application();
 await app.init({ background: '#1099bb', resizeTo: window });

const container = document.getElementById('pixi-container');
container?.appendChild(app.canvas); 
// Создаём игрока (красный квадрат)
const player = new Graphics();
player.beginFill(0xff0000);
player.drawRect(0, 0, 50, 50);
player.endFill();
player.x = app.screen.width / 2 - 25;
player.y = app.screen.height / 2 - 25;
app.stage.addChild(player);

// Текст для отображения координат
const coordText = new Text('', { fill: 0xffffff, fontSize: 16 });
coordText.x = 10;
coordText.y = 10;
app.stage.addChild(coordText);

// Состояние клавиш с типизацией
const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e: KeyboardEvent) => {
    keys[e.code] = true;
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys[e.code] = false;
});

// Игровой цикл
app.ticker.add((ticker) => {
 const delta = ticker.deltaTime;
  const speed = 5 * delta; // умножаем на delta, чтобы движение было плавным независимо от FPS

    // Движение с проверкой границ
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= speed;
    }
    if (keys['ArrowRight'] && player.x < app.screen.width - 50) {
        player.x += speed;
    }
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= speed;
    }
    if (keys['ArrowDown'] && player.y < app.screen.height - 50) {
        player.y += speed;
    }

    // Обновляем текст
    coordText.text = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;
});