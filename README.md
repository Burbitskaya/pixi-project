# Dungeon Crawler (Pixi.js + TypeScript)

A small roguelike dungeon crawler built with Pixi.js and TypeScript. Explore procedurally designed levels (made with Tiled), collect keys, defeat enemies, and find the portal to the next level!

## 🎮 Features

- Real‑time movement with smooth animation 
- Enemies with health displayed as hearts; they chase the player and deal damage on contact
- Collect keys (3 per level) to unlock the portal 
- Health potions heal the player (only if health is not full)
- Active attack: press **Space** to strike in front of you (visual feedback)
- Level progression: after collecting 3 keys, stand on the portal to advance to the next level
- Persistent health across levels; if you die, the page reloads
- Camera follows the player, with boundaries clamped to the map
- HUD shows level number, collected keys, and health 

## 🛠️ Technologies

- [PixiJS](https://pixijs.com/) v7+ – rendering engine
- [TypeScript](https://www.typescriptlang.org/) – type‑safe JavaScript
- [Tiled](https://www.mapeditor.org/) – map editor (JSON export)
- [Vite](https://vitejs.dev/) – build tool and dev server

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dungeon-crawler.git
   cd dungeon-crawler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` in your browser.

4. **Build for production**
   ```bash
   npm run build
   ```
   The output will be in the `dist` folder.

## 🎯 How to Play

- **Arrow keys** – move the character
- **Space** – attack in the direction you are facing
- **Goal**: collect all three keys on the current level, then step onto the portal (looks like a special tile) to advance.
- Watch out for enemies! If they touch you, you lose one heart. Enemies also have hearts – hit them enough times to defeat them.
- Health potions restore one heart, but only if you are not already at full health.

## 📁 Project Structure

```
src/
├── main.ts                 # entry point, game loop, level switching
├── types.ts                # TypeScript interfaces (Tiled, game objects)
├── TileMap.ts              # tilemap loading, walkability checks
├── Player.ts               # player movement, animation, attack
├── EnemyManager.ts         # enemy creation, AI, health display
├── ItemManager.ts          # item creation and collection
├── HUD.ts                  # heads‑up display (health, keys, level)
public/
├── assets/
│   ├── map.json            # exported Tiled map
│   ├── tileset.png         # tileset image
│   ├── hero.png            # player sprite sheet
│   └── ...                 # other assets
index.html                  # main HTML file
package.json
vite.config.js              # Vite configuration
```

## 🧩 Customising Maps

Maps are created in **Tiled** and exported as JSON. The project expects the following layer structure inside a **group** for each level:

- `land` – tile layer (walkable / non‑walkable tiles)
- `objects` – object layer for items (keys, health potions)
- `enemies` – object layer for enemies

The first level group must be named `"1"`, the second `"2"`, etc. Walkability is defined by a set of GIDs in `TileMap.ts`. The portal tile is currently hard‑coded as GID `3969`.


---

Happy dungeon crawling! 🧙‍♂️🗝️
