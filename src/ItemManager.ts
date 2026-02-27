import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { TiledObjectLayer, Item } from './types';

export class ItemManager {
  public items: Item[] = [];
  private container: Container;

  constructor(objectLayer: TiledObjectLayer | undefined, tilesetTexture: Texture, firstgid: number, tileSize: number, container: Container) {
    this.container = container;
    if (!objectLayer) return;
    const tilesPerRow = Math.floor(tilesetTexture.width / tileSize);
    for (const obj of objectLayer.objects) {
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
      sprite.x = col * tileSize;
      sprite.y = row * tileSize;
      this.container.addChild(sprite);
      this.items.push({ sprite, type: obj.type, col, row });
    }
  }

}