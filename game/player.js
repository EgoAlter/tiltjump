// player.js — Player entity: position, velocity, physics, wrap-around.
// No sensor or rendering logic here — this is pure game physics.

// --- Physics constants ---

// Gravity: added to vy every frame, pulling the player downward.
// 0.3 px/frame² gives a floaty feel suited to a portrait mobile game.
const GRAVITY = 0.3;

// Upward velocity applied on landing. Negative = moving up in canvas coords.
// Peak height ≈ v² / (2 * gravity) = 13² / 0.6 ≈ 281 px per bounce.
const BOUNCE_VELOCITY = -13;

// Maximum horizontal speed (pixels/frame). Tilt value (-1..+1) × this = vx.
const MAX_TILT_SPEED = 7; // Tune this if tilt feels too slow/fast — single source of truth

export class Player {
  constructor(canvas) {
    this.width  = 36;
    this.height = 36;
    this.reset(canvas);
  }

  // Reset to starting position — called at game start and on retry.
  // Stores canvas width so update() can do wrap-around without a canvas reference.
  reset(canvas) {
    // Store the canvas element (not its dimensions) so wrap-around always
    // reads the current width even after a resize event updates canvas.width.
    this._canvas = canvas;
    this.x  = canvas.width / 2 - this.width / 2;
    this.y  = canvas.height - 150;
    this.vx = 0;
    // Start with an upward kick so the player immediately begins climbing
    this.vy = BOUNCE_VELOCITY;
  }

  // Advance physics by one frame.
  // tilt: -1.0 (full left) to +1.0 (full right) from SensorManager.getTilt()
  update(tilt) {
    // Horizontal velocity is set directly from tilt — not accumulated.
    // WHY: tilt controls direction, not thrust. The player should move as long
    // as the phone is tilted and stop when it's upright. Accumulating vx would
    // cause overshoot that feels broken on a small portrait screen.
    this.vx = tilt * MAX_TILT_SPEED;

    // Gravity pulls downward every frame (positive = downward in canvas coords)
    this.vy += GRAVITY;

    this.x += this.vx;
    this.y += this.vy;

    // Horizontal wrap-around — the signature Doodle Jump mechanic.
    // Exit left edge → reappear at right, and vice versa.
    // We wrap on the player's full width so the exit is edge-by-edge, not a pop.
    if (this.right < 0) {
      this.x = this._canvas.width;
    } else if (this.x > this._canvas.width) {
      this.x = -this.width;
    }
  }

  // Apply upward bounce on platform landing.
  // Called by PlatformManager; caller is responsible for snapping y to platform top.
  bounce() {
    this.vy = BOUNCE_VELOCITY;
  }

  // Edge getters — used by PlatformManager for collision detection
  get top()    { return this.y; }
  get bottom() { return this.y + this.height; }
  get left()   { return this.x; }
  get right()  { return this.x + this.width; }
}
