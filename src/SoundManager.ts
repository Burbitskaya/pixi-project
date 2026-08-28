import { sound } from "@pixi/sound";
import { assetUrl } from "./assetUrl";

export class SoundManager {
  private static instance: SoundManager;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.5;
  private isMuted: boolean = false;
  private musicStarted: boolean = false;

  private constructor() {}

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Загружает и регистрирует все звуки.
   * Вызовите один раз после загрузки ресурсов в main.ts.
   */
  public async loadSounds() {
    // Фоновая музыка (зацикленная)
    sound.add("bgMusic", {
      url: assetUrl("assets/sounds/background.wav"),
      loop: true,
      volume: this.musicVolume,
      preload: true,
      singleInstance: true,
    });

    // Эффекты (однократные)
    sound.add("footstep", assetUrl("assets/sounds/footstep.wav"));
    sound.add("playerAttack", assetUrl("assets/sounds/swish.wav"));
    sound.add("enemyHurt", assetUrl("assets/sounds/hit.wav"));
    sound.add("enemyBite", assetUrl("assets/sounds/bite.wav"));
    sound.add("playerHurt", assetUrl("assets/sounds/player_hurt.wav"));
    sound.add("enemyDie", assetUrl("assets/sounds/enemy_die.wav"));
    sound.add("playerDie", assetUrl("assets/sounds/player_die.wav"));
    sound.add("keyPickup", assetUrl("assets/sounds/key.wav"));
    sound.add("healthPickup", assetUrl("assets/sounds/health.wav"));
    sound.add("levelComplete", assetUrl("assets/sounds/level_complete.mp3"));
  }

  // ---------- Воспроизведение ----------
  public async playBackgroundMusic() {
    if (this.musicStarted || this.isMuted) return;

    const ctx = sound.context.audioContext;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (ctx.state !== "running") return;

    sound.context.paused = false;
    sound.play("bgMusic", { loop: true, volume: this.musicVolume });
    this.musicStarted = true;
  }

  public startMusicOnUserGesture() {
    const tryStart = () => {
      void this.playBackgroundMusic().then(() => {
        if (!this.musicStarted) return;
        window.removeEventListener("pointerdown", tryStart);
        window.removeEventListener("keydown", tryStart);
        document.getElementById("start-overlay")?.classList.add("hidden");
      });
    };

    window.addEventListener("pointerdown", tryStart);
    window.addEventListener("keydown", tryStart);
  }

  public stopBackgroundMusic() {
    sound.stop("bgMusic");
  }

  public playFootstep() {
    if (this.isMuted) return;
    // Шаги делаем тише
    sound.play("footstep", { volume: this.sfxVolume * 0.2 });
  }

  public playPlayerAttack() {
    if (this.isMuted) return;
    sound.play("playerAttack", { volume: this.sfxVolume });
  }

  public playEnemyHurt() {
    if (this.isMuted) return;
    sound.play("enemyHurt", { volume: this.sfxVolume });
  }

  public playEnemyBite() {
    if (this.isMuted) return;
    sound.play("enemyBite", { volume: this.sfxVolume });
  }

  public playPlayerHurt() {
    if (this.isMuted) return;
    sound.play("playerHurt", { volume: this.sfxVolume });
  }

  public playEnemyDie() {
    if (this.isMuted) return;
    sound.play("enemyDie", { volume: this.sfxVolume });
  }

  public playPlayerDie() {
    if (this.isMuted) return;
    sound.play("playerDie", { volume: this.sfxVolume });
  }

  public playKeyPickup() {
    if (this.isMuted) return;
    sound.play("keyPickup", { volume: this.sfxVolume });
  }

  public playHealthPickup() {
    if (this.isMuted) return;
    sound.play("healthPickup", { volume: this.sfxVolume });
  }

  public playLevelComplete() {
    if (this.isMuted) return;
    sound.play("levelComplete", { volume: this.sfxVolume });
  }

  // ---------- Управление громкостью ----------
  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    sound.volume("bgMusic", this.musicVolume);
  }

  public setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public mute() {
    this.isMuted = true;
    sound.muteAll();
  }

  public unmute() {
    this.isMuted = false;
    sound.unmuteAll();
  }

  public toggleMute() {
    if (this.isMuted) this.unmute();
    else this.mute();
  }

  public stopAll() {
    sound.stopAll();
  }
}
