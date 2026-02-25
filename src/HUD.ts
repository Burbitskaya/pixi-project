import { Container, Graphics, Text, Sprite, Texture, Application } from 'pixi.js';

export class HUD {
  public container: Container;
  private hearts: Graphics[] = [];
  private keyText: Text;
  private keyIcon: Sprite;
  private titleText: Text;
  private levelText: Text;
  private hudBackground: Graphics;
  private heartSize = 24;
  private requiredKeys: number;
  private app: Application;

  constructor(app: Application, keyTexture: Texture, requiredKeys: number) {
    this.app = app;
    this.requiredKeys = requiredKeys;
    this.container = new Container();

    this.hudBackground = new Graphics();
    this.container.addChild(this.hudBackground);

    this.titleText = new Text({
      text: 'Dungeon Crawler',
      style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' }
    });
    this.container.addChild(this.titleText);

    this.levelText = new Text({
      text: 'lvl 1',
      style: { fill: '#ffffff', fontSize: 20 }
    });
    this.container.addChild(this.levelText);

    this.keyIcon = new Sprite(keyTexture);
    this.keyIcon.width = 40;
    this.keyIcon.height = 40;
    this.container.addChild(this.keyIcon);

    this.keyText = new Text({
      text: `0/${requiredKeys}`,
      style: { fill: '#ffffff', fontSize: 20 }
    });
    this.container.addChild(this.keyText);

    for (let i = 0; i < 3; i++) {
      const heart = this.createHeartSprite(this.heartSize);
      heart.x = 10 + i * (this.heartSize + 5);
      heart.y = 70;
      this.container.addChild(heart);
      this.hearts.push(heart);
    }

    this.updatePositions();
    window.addEventListener('resize', () => this.updatePositions());
  }

  private createHeartSprite(size: number): Graphics {
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
    return heart;
  }

  private updatePositions() {
    const padding = 10;
    const screenWidth = this.app.screen.width;

    this.titleText.x = padding;
    this.titleText.y = padding;
    this.levelText.x = this.titleText.x + 230;
    this.levelText.y = padding;

    const heartsWidth = this.hearts.length * (this.heartSize + 5) - 5;
    const keyWidth = this.keyIcon.width + 5 + this.keyText.width;
    const rightGroupWidth = heartsWidth + keyWidth + 30;
    const rightGroupX = screenWidth - padding - rightGroupWidth;

    this.keyIcon.x = rightGroupX;
    this.keyIcon.y = padding + (this.titleText.height - this.keyIcon.height) / 2;
    this.keyText.x = this.keyIcon.x + this.keyIcon.width + 5;
    this.keyText.y = this.keyIcon.y + (this.keyIcon.height - this.keyText.height) / 2;

    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].x = this.keyText.x + this.keyText.width + 20 + i * (this.heartSize + 5);
      this.hearts[i].y = padding + (this.titleText.height - this.heartSize);
    }

    const maxY = Math.max(
      this.titleText.y + this.titleText.height,
      this.levelText.y + this.levelText.height,
      this.keyIcon.y + this.keyIcon.height,
      this.keyText.y + this.keyText.height,
      ...this.hearts.map(h => h.y + this.heartSize)
    );
    const hudHeight = maxY;

    this.hudBackground.clear();
    this.hudBackground.rect(0, 0, screenWidth, hudHeight);
    this.hudBackground.fill({ color: 0x000000, alpha: 0.6 });
  }

  public updateHealth(health: number) {
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].visible = i < health;
    }
  }

  public updateKeys(collected: number) {
    this.keyText.text = `${collected}/${this.requiredKeys}`;
  }
}