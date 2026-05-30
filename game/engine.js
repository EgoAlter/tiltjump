// engine.js — Game loop and state machine. Orchestrates all other modules.
//
// WHY a state machine?
// The game has four fundamentally different modes of operation (splash, permission,
// playing, game-over). Each mode needs different update logic and different rendering.
// A state machine makes these explicit and prevents "if isPaused && !isGameOver && ..."
// chains that become unreadable fast.

import { Player } from './player.js';
import { PlatformManager } from './platforms.js';
import { Renderer } from './renderer.js';
import { SensorManager } from './sensors.js';
import { ScoreManager } from './score.js';
import { Screens } from '../ui/screens.js';
import { HUD } from '../ui/hud.js';

// The four game states — exported so other modules can reference them if needed
export const STATE = {
  SPLASH:     'SPLASH',
  PERMISSION: 'PERMISSION',
  PLAYING:    'PLAYING',
  GAME_OVER:  'GAME_OVER',
};

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = STATE.SPLASH;
    this.lastTime = 0;

    // Instantiate all subsystems — each owns its slice of game logic
    this.player    = new Player(canvas);
    this.platforms = new PlatformManager(canvas);
    this.renderer  = new Renderer(canvas, this.ctx);
    this.score     = new ScoreManager();
    this.screens   = new Screens(canvas, this.ctx);
    this.hud       = new HUD(canvas, this.ctx);

    this._bindInput();
  }

  // Kick off the requestAnimationFrame loop
  start() {
    requestAnimationFrame(t => this._loop(t));
  }

  // Bind tap/click events for state transitions.
  // These are UI transitions, not gameplay input — gameplay input is in sensors.js.
  _bindInput() {
    const handleTap = () => {
      if (this.state === STATE.SPLASH) {
        this._requestSensorPermission();
      } else if (this.state === STATE.GAME_OVER) {
        this._startGame();
      }
    };

    // Both click (desktop) and touchend (mobile) trigger transitions
    this.canvas.addEventListener('click', handleTap);
    this.canvas.addEventListener('touchend', handleTap, { passive: true });
  }

  // Request sensor permission — must be initiated by a user gesture.
  //
  // iOS 13+ CRITICAL: DeviceOrientationEvent.requestPermission() will silently
  // return 'denied' if called outside a user gesture handler (e.g. on page load).
  // The browser considers a tap/click handler a valid gesture. Async/await here
  // is fine — iOS tracks the gesture chain through async calls.
  //
  // COCKTAIL SHAKER NOTE: identical permission flow required there.
  async _requestSensorPermission() {
    this.state = STATE.PERMISSION; // Show permission screen immediately while dialog shows
    const granted = await SensorManager.requestPermission();

    if (granted) {
      SensorManager.startOrientation();
      SensorManager.startMotion();
    }
    // Even if denied, we start the game — keyboard/fallback controls still work

    this._startGame();
  }

  // Reset all game state and begin a new round
  _startGame() {
    this.player.reset(this.canvas);
    this.platforms.reset(this.canvas);
    this.score.reset();
    // Capture current tilt angle as the "zero" reference — must happen at game start
    // so the player's natural hold angle is treated as straight ahead
    SensorManager.calibrate();
    this.state = STATE.PLAYING;
  }

  // Core game loop — called by requestAnimationFrame every ~16ms (60fps)
  _loop(timestamp) {
    // Schedule next frame before doing any work, so a thrown error doesn't kill the loop
    requestAnimationFrame(t => this._loop(t));

    // Cap delta time at ~33ms (30fps floor).
    // WHY: if the tab is backgrounded and then focused again, timestamp could be
    // thousands of ms ahead. Without the cap, physics would explode (huge dt → huge
    // position change → player falls through the floor in one step).
    const dt = Math.min(timestamp - this.lastTime, 33);
    this.lastTime = timestamp;

    if (this.state === STATE.PLAYING) {
      this._update(dt);
    }

    this._render();
  }

  // Update game world for one frame — only runs in PLAYING state
  _update(dt) {
    // getTilt() returns -1.0 (full left) to +1.0 (full right).
    // In stub mode this reads arrow keys. In real mode it reads DeviceOrientationEvent.
    // The rest of the update code doesn't know or care which.
    const tilt = SensorManager.getTilt();

    this.player.update(tilt);
    this.platforms.update(this.player, this.score);

    // Death condition: player fell below the bottom of the screen
    if (this.player.y > this.canvas.height + 80) {
      this._gameOver();
    }
  }

  // Transition to game over — save score and stop sensors
  _gameOver() {
    this.score.save();
    SensorManager.stop();
    this.state = STATE.GAME_OVER;
  }

  // Render the current frame — always runs regardless of game state
  _render() {
    this.renderer.clear();

    switch (this.state) {
      case STATE.SPLASH:
        this.screens.drawSplash();
        break;

      case STATE.PERMISSION:
        this.screens.drawPermission();
        break;

      case STATE.PLAYING:
        this.renderer.drawPlatforms(this.platforms.getAll());
        this.renderer.drawPlayer(this.player);
        this.hud.draw(this.score);
        this.hud.drawDebug(SensorManager.debug()); // Stripped in Session 5
        break;

      case STATE.GAME_OVER:
        // Draw the frozen game world behind the overlay so it's not a black screen
        this.renderer.drawPlatforms(this.platforms.getAll());
        this.renderer.drawPlayer(this.player);
        this.screens.drawGameOver(this.score);
        break;
    }
  }
}
