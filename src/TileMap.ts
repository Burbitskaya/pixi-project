import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { TiledMap, TiledLayer } from './types';

export class TileMap {
  public container: Container;
  public groundLayer: TiledLayer;
  public tileSize: number;
  private walkableGids: Set<number>;

  constructor(mapData: TiledMap, tilesetTexture: Texture, private firstgid: number) {
    this.container = new Container();
    this.tileSize = mapData.tilewidth;
    const tilesPerRow = Math.floor(tilesetTexture.width / this.tileSize);

    const groundLayer = mapData.layers.find((layer): layer is TiledLayer => layer.id === 1);
    if (!groundLayer) throw new Error('Слой "land" не найден');
    this.groundLayer = groundLayer;

    this.walkableGids = new Set([5725, 6593, 6597, 6841, 8390, 8774]);

    this.drawMap(groundLayer, tilesetTexture, tilesPerRow);
  }

  private drawMap(layer: TiledLayer, texture: Texture, tilesPerRow: number) {
    for (let row = 0; row < layer.height; row++) {
      for (let col = 0; col < layer.width; col++) {
        const gid = layer.data[row * layer.width + col];
        if (gid === 0) continue;

        const localTileId = gid - this.firstgid;
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
}