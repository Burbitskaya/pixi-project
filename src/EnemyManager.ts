import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';
import { TiledObjectLayer, Enemy } from './types';
import { TileMap } from './TileMap';
import { Player } from './Player';

export class EnemyManager {
  public enemies: Enemy[] = [];
  private container: Container;       // общий контейнер для всех врагов 
  private tileMap: TileMap;
  private speed: number = 1.5;
  private heartSize: number = 10;      // размер сердечка над врагом

  constructor(warriorLayer: TiledObjectLayer | undefined, tilesetTexture: Texture, firstgid: number, tileSize: number, worldContainer: Container, tileMap: TileMap) {
    this.container = new Container();  
    worldContainer.addChild(this.container);
    this.tileMap = tileMap;

    if (!warriorLayer) return;
    const tilesPerRow = Math.floor(tilesetTexture.width / tileSize);

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

      // --- Создаём контейнер для отдельного врага ---
      const enemyContainer = new Container();
      enemyContainer.x = col * tileSize + tileSize / 2;
      enemyContainer.y = row * tileSize + tileSize / 2;
      this.container.addChild(enemyContainer);

      // Спрайт врага
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      enemyContainer.addChild(sprite);

      // --- Сердечки здоровья ---
      const hearts = this.createHearts(2, this.heartSize);
      // Позиционируем сердечки над спрайтом
      const totalHeartsWidth = hearts.length * (this.heartSize + 2) - 2; // 2px отступ между сердцами
      const startX = -totalHeartsWidth / 2;
      for (let i = 0; i < hearts.length; i++) {
        hearts[i].x = startX + i * (this.heartSize + 2);
        hearts[i].y = -sprite.height / 2 - this.heartSize / 2 - 2; // чуть выше спрайта
        enemyContainer.addChild(hearts[i]);
      }

      this.enemies.push({
        container: enemyContainer,
        sprite,
        hearts,
        col,
        row,
        health: 2,
        isMoving: false,
        moveTargetX: enemyContainer.x,
        moveTargetY: enemyContainer.y,
        justDamaged: false,  
      });
    }
  }

  // Создание графического сердечка
  private createHearts(count: number, size: number): Graphics[] {
    const hearts: Graphics[] = [];
    for (let i = 0; i < count; i++) {
      const heart = new Graphics();
      const scale = size / 30; 
      heart.poly([
        { x: 15 * scale, y: 5 * scale },
        { x: 10 * scale, y: 0 * scale },
        { x: 5 * scale, y: 5 * scale },
        { x: 5 * scale, y: 10 * scale },
        { x: 15 * scale, y: 20 * scale },
        { x: 25 * scale, y: 10 * scale },
        { x: 25 * scale, y: 5 * scale },
        { x: 20 * scale, y: 0 * scale },
        { x: 15 * scale, y: 5 * scale },
      ]).fill(0xff0000);
      heart.visible = true;
      hearts.push(heart);
    }
    return hearts;
  }

  public update(player: Player) {
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;

      // Проверяем, достиг ли враг цели
      const distToTarget = Math.hypot(enemy.moveTargetX - enemy.container.x, enemy.moveTargetY - enemy.container.y);
      if (!enemy.isMoving || distToTarget < 1) {
        // Выбор новой цели
        const playerCol = player.col;
        const playerRow = player.row;
        const distToPlayer = Math.abs(enemy.col - playerCol) + Math.abs(enemy.row - playerRow);

        let targetCol = enemy.col;
        let targetRow = enemy.row;

        if (distToPlayer <= 4) {
          const dx = Math.sign(playerCol - enemy.col);
          const dy = Math.sign(playerRow - enemy.row);
          if (dx !== 0 && (Math.abs(dx) >= Math.abs(dy) || dy === 0)) {
            targetCol = enemy.col + dx;
          } else if (dy !== 0) {
            targetRow = enemy.row + dy;
          }
        } else {
          if (Math.random() < 0.02) {
            const dir = Math.floor(Math.random() * 4);
            targetCol = enemy.col + (dir === 0 ? -1 : dir === 1 ? 1 : 0);
            targetRow = enemy.row + (dir === 2 ? -1 : dir === 3 ? 1 : 0);
          }
        }

        if ((targetCol !== enemy.col || targetRow !== enemy.row) &&
            this.tileMap.isWalkable(targetCol, targetRow) &&
            !this.enemies.some(e => e !== enemy && e.col === targetCol && e.row === targetRow && e.health > 0)) {
          enemy.moveTargetX = targetCol * this.tileMap.tileSize + this.tileMap.tileSize / 2;
          enemy.moveTargetY = targetRow * this.tileMap.tileSize + this.tileMap.tileSize / 2;
          enemy.isMoving = true;
          enemy.col = targetCol;
          enemy.row = targetRow;
        } else {
          enemy.isMoving = false;
        }
      }

      // Движение к цели
      if (enemy.isMoving) {
        const dx = enemy.moveTargetX - enemy.container.x;
        const dy = enemy.moveTargetY - enemy.container.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.speed) {
          enemy.container.x += (dx / dist) * this.speed;
          enemy.container.y += (dy / dist) * this.speed;
        } else {
          enemy.container.x = enemy.moveTargetX;
          enemy.container.y = enemy.moveTargetY;
          enemy.isMoving = false;
        }
      }
    }
  }

 public checkCollisions(player: Player, onPlayerDamage: (health: number) => void) {
  const playerX = player.sprite.x;
  const playerY = player.sprite.y;
  const threshold = 10; // пикселей

  for (let i = this.enemies.length - 1; i >= 0; i--) {
    const enemy = this.enemies[i];
    if (enemy.health <= 0) continue;

    const enemyX = enemy.sprite.x;
    const enemyY = enemy.sprite.y;
    const dx = playerX - enemyX;
    const dy = playerY - enemyY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < threshold) {
      if (!enemy.justDamaged) {
        player.takeDamage();
        enemy.health--;
        enemy.justDamaged = true;

        // Обновляем сердечки врага
        for (let j = 0; j < enemy.hearts.length; j++) {
          enemy.hearts[j].visible = j < enemy.health;
        }

        onPlayerDamage(player.health);

        if (enemy.health <= 0) {
          this.container.removeChild(enemy.container);
          this.enemies.splice(i, 1);
        }
        if (player.health <= 0) {
          // можно вызвать колбэк или обработать здесь
        }
      }
    } else {
      // Если враг далеко, сбрасываем флаг
      enemy.justDamaged = false;
    }
  }
}

  public attackEnemyAt(col: number, row: number, damage: number): boolean {
  for (let i = 0; i < this.enemies.length; i++) {
    const enemy = this.enemies[i];
    if (enemy.health <= 0) continue;
    if (enemy.col === col && enemy.row === row) {
      enemy.health -= damage;
      enemy.justDamaged = true;  
      // Обновляем видимость сердечек
      for (let j = 0; j < enemy.hearts.length; j++) {
        enemy.hearts[j].visible = j < enemy.health;
      }
      if (enemy.health <= 0) {
        this.container.removeChild(enemy.container);
        this.enemies.splice(i, 1);
      }
      return true; // попал
    }
  }
  return false; // промах
}
}