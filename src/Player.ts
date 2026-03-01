import { Sprite, Texture } from 'pixi.js';
import { TileMap } from './TileMap';
import { SoundManager } from './SoundManager';

export class Player {
  public sprite: Sprite;
  public health: number = 3;
  private direction: string = 'down';
  private animFrame: number = 0;
  private animTimer: number = 0;
  private textures: Record<string, Texture[]>;
  private tileMap: TileMap | null; // может быть null до установки карты
  private keys: Record<string, boolean> = {};
  public speed: number = 3;

  constructor(textures: Record<string, Texture[]>, tileMap: TileMap | null, startCol: number, startRow: number, tileSize: number) {
    this.textures = textures;
    this.tileMap = tileMap;
    this.sprite = new Sprite(textures.down[0]);
    this.sprite.anchor.set(0.5);
    this.sprite.x = startCol * tileSize + tileSize / 2;
    this.sprite.y = startRow * tileSize + tileSize / 2;
  }

  public setKey(code: string, pressed: boolean) {
    if (code.startsWith('Arrow')) {
      this.keys[code] = pressed;
    }
  }

  public update() {
    if (!this.tileMap) return; // карта ещё не загружена

    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft']) dx = -1;
    if (this.keys['ArrowRight']) dx = 1;
    if (this.keys['ArrowUp']) dy = -1;
    if (this.keys['ArrowDown']) dy = 1;

    if (dx !== 0 || dy !== 0) {
      // Нормализация диагонали
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      // Определяем направление
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else if (Math.abs(dy) > 0) {
        this.direction = dy > 0 ? 'down' : 'up';
      }

      let newX = this.sprite.x + dx * this.speed;
      let newY = this.sprite.y + dy * this.speed;

      // Проверка коллизий со стенами
      const newCol = Math.floor(newX / this.tileMap.tileSize);
      const newRow = Math.floor(newY / this.tileMap.tileSize);
      const currentCol = Math.floor(this.sprite.x / this.tileMap.tileSize);
      const currentRow = Math.floor(this.sprite.y / this.tileMap.tileSize);

      if (newCol !== currentCol || newRow !== currentRow) {
        if (!this.tileMap.isWalkable(newCol, newRow)) {
          
          // Диагональ: пробуем поочерёдно
          if (dx !== 0 && dy !== 0) {
           
            const tryX = this.sprite.x + dx * this.speed;
            const tryColX = Math.floor(tryX / this.tileMap.tileSize);
            if (tryColX !== currentCol && !this.tileMap.isWalkable(tryColX, currentRow)) {
              newX = this.sprite.x;
            } else {
              newX = tryX;
            }
            const tryY = this.sprite.y + dy * this.speed;
            const tryRowY = Math.floor(tryY / this.tileMap.tileSize);
            if (tryRowY !== currentRow && !this.tileMap.isWalkable(currentCol, tryRowY)) {
              newY = this.sprite.y;
            } else {
              newY = tryY;
            }
          } else {
            newX = this.sprite.x;
            newY = this.sprite.y;
          }
        }
      }

      this.sprite.x = newX;
      this.sprite.y = newY;
      

      // Анимация движения
      this.animTimer++;
      if (this.animTimer >= 5) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 3;
        SoundManager.getInstance().playFootstep();
      }
       
      this.sprite.texture = this.textures[this.direction][this.animFrame];
    } else {
      // Стоим
      this.sprite.texture = this.textures[this.direction][1];
    }
  }

  public get col() {
    if (!this.tileMap) return 0;
    return Math.floor(this.sprite.x / this.tileMap.tileSize);
  }

  public get row() {
    if (!this.tileMap) return 0;
    return Math.floor(this.sprite.y / this.tileMap.tileSize);
  }

  public takeDamage(amount: number = 1) {
    this.health -= amount;
    SoundManager.getInstance().playPlayerHurt();
    return this.health <= 0;
  }

  public getAttackCell(): { col: number; row: number } | null {
    if (!this.tileMap) return null;
    const currentCol = this.col;
    const currentRow = this.row;
    let col = currentCol, row = currentRow;
    switch (this.direction) {
      case 'up':    row = currentRow - 1; break;
      case 'down':  row = currentRow + 1; break;
      case 'left':  col = currentCol - 1; break;
      case 'right': col = currentCol + 1; break;
      default: return null;
    }
    // Проверка границ карты
    if (col < 0 || col >= this.tileMap.groundLayer.width || row < 0 || row >= this.tileMap.groundLayer.height) {
      return null;
    }
    SoundManager.getInstance().playPlayerAttack();
    return { col, row };
  }

  public setTileMap(tileMap: TileMap) {
    this.tileMap = tileMap;
  }
}