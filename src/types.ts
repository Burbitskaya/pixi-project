import { Sprite } from "pixi.js";

export interface TiledLayer {
  id: number;
  name: string;
  data: number[];
  width: number;
  height: number;
}

interface TiledObject {
  gid: number;
  height: number;
  id: number;
  name: string;
  rotation: number;
  type: string;
  visible: boolean;
  width: number;
  x: number;
  y: number;
}

export interface TiledObjectLayer {
  draworder: string;
  id: number;
  name: string;
  objects: TiledObject[];
  opacity: number;
  type: 'objectgroup';
  visible: boolean;
  x: number;
  y: number;
}

export interface TiledMap {
  layers: (TiledLayer | TiledObjectLayer)[];
  tilewidth: number;
  tileheight: number;
  width: number;
  height: number;
  tilesets: { firstgid: number; source: string }[];
}

// --- Игровые типы ---
export interface Enemy {
  sprite: Sprite;
  col: number;          // логические координаты клетки
  row: number;
  health: number;
  isMoving: boolean;
  moveTargetX: number;
  moveTargetY: number;
}

export interface Item {
  sprite: Sprite;
  type: string;         // 'key' или 'helth'
  col: number;
  row: number;
}