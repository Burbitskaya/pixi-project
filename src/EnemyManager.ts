import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { TiledObjectLayer, Enemy } from './types';
import { TileMap } from './TileMap';
import { Player } from './Player';

export class EnemyManager {
  public enemies: Enemy[] = [];
  private container: Container;
  private tileMap: TileMap;
  private speed: number = 1.5;

  constructor(warriorLayer: TiledObjectLayer | undefined, tilesetTexture: Texture, firstgid: number, tileSize: number, container: Container, tileMap: TileMap) {
    this.container = container;
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
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = col * tileSize + tileSize / 2;
      sprite.y = row * tileSize + tileSize / 2;
      this.container.addChild(sprite);

      this.enemies.push({
        sprite,
        col,
        row,
        health: 2,
        isMoving: false,
        moveTargetX: col * tileSize + tileSize / 2,
        moveTargetY: row * tileSize + tileSize / 2,
      });
    }
  }

  public update(player: Player) {
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;

      const distToTarget = Math.hypot(enemy.moveTargetX - enemy.sprite.x, enemy.moveTargetY - enemy.sprite.y);
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

      if (enemy.isMoving) {
        const dx = enemy.moveTargetX - enemy.sprite.x;
        const dy = enemy.moveTargetY - enemy.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.speed) {
          enemy.sprite.x += (dx / dist) * this.speed;
          enemy.sprite.y += (dy / dist) * this.speed;
        } else {
          enemy.sprite.x = enemy.moveTargetX;
          enemy.sprite.y = enemy.moveTargetY;
          enemy.isMoving = false;
        }
      }
    }
  }

  public checkCollisions(player: Player, onPlayerDamage: (health: number) => void) {
    const playerCol = player.col;
    const playerRow = player.row;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.health <= 0) continue;
      const enemyCol = Math.floor(enemy.sprite.x / this.tileMap.tileSize);
      const enemyRow = Math.floor(enemy.sprite.y / this.tileMap.tileSize);
      if (enemyCol === playerCol && enemyRow === playerRow) {
        player.takeDamage();
        enemy.health--;
        onPlayerDamage(player.health);
        if (enemy.health <= 0) {
          this.container.removeChild(enemy.sprite);
          this.enemies.splice(i, 1);
        }
        if (player.health <= 0) {
          // Game Over
        }
        break;
      }
    }
  }
}