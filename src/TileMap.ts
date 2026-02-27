import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { TiledLayer } from './types';

export class TileMap {
  public container: Container;
  public groundLayer: TiledLayer;
  public tileSize: number;
  private walkableGids: Set<number>;

  constructor(groundLayer: TiledLayer, tilesetTexture: Texture, firstgid: number, tileSize: number) {
    this.container = new Container();
    this.tileSize = tileSize;
    this.groundLayer = groundLayer;
    this.walkableGids = new Set([5725, 6593, 6597, 6841, 8390, 8774,5493,2934,2942,6634, 3969]);

    const tilesPerRow = Math.floor(tilesetTexture.width / tileSize);
    this.drawMap(groundLayer, tilesetTexture, tilesPerRow, firstgid);
  }

  private drawMap(layer: TiledLayer, texture: Texture, tilesPerRow: number, firstgid: number) {
    for (let row = 0; row < layer.height; row++) {
      for (let col = 0; col < layer.width; col++) {
        const gid = layer.data[row * layer.width + col];
        if (gid === 0) continue;

        const localTileId = gid - firstgid;
        const tileX = (localTileId % tilesPerRow) * this.tileSize;
        const tileY = Math.floor(localTileId / tilesPerRow) * this.tileSize;

        const tileTexture = new Texture({
          source: texture.source,
          frame: new Rectangle(tileX, tileY, this.tileSize, this.tileSize),
        });

        const tileSprite = new Sprite(tileTexture);
        tileSprite.x = col * this.tileSize;
        tileSprite.y = row * this.tileSize;
        this.container.addChild(tileSprite);
      }
    }
  }

  isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= this.groundLayer.width || row < 0 || row >= this.groundLayer.height) return false;
    const gid = this.groundLayer.data[row * this.groundLayer.width + col];
    return this.walkableGids.has(gid);
  }

  getGidAt(col: number, row: number): number | null {
    if (col < 0 || col >= this.groundLayer.width || row < 0 || row >= this.groundLayer.height) return null;
    return this.groundLayer.data[row * this.groundLayer.width + col];
  }
}