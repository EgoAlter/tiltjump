// renderer.js — All canvas drawing. Receives game state as data; draws it.
// No physics or game logic here — pure visual output.
//
// WHY canvas instead of DOM elements:
// At 60fps with dozens of moving objects, updating DOM positions forces the browser
// to recalculate layout on every frame (layout thrashing). Canvas gives us a raw
// 2D buffer: we clear it and redraw everything each frame, bypassing the layout engine.
// For a game this is always faster and simpler than DOM animation.

// Colour palette — retro pixel aesthetic, dark background with neon accents
const COLOURS = {
  background:      '#0a0a1a', // Near-black blue — feels like a CRT in a dark room
  backgroundGrid:  '#0f0f2a', // Very slightly lighter for grid lines
  player:          '#00ff88', // Neon green — high contrast on dark background
  playerShadow:    '#003322', // Darker green for pixel "shadow" on the character
  platform:        '#ff6600', // Neon orange
  platformShine:   '#ffaa44', // Lighter stripe on top for a chunky 3D feel
  platformShadow:  '#882200', // Darker bottom edge
};

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  // Clear the canvas each frame — required before redrawing everything
  clear() {
    const { ctx, canvas } = this;

    // Fill with background colour
    ctx.fillStyle = COLOURS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle vertical scan lines — gives a faint CRT retro feel.
    // Drawn every 4px, semi-transparent so they don't dominate.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let x = 0; x < canvas.width; x += 4) {
      ctx.fillRect(x, 0, 2, canvas.height);
    }
  }

  // Draw the player as a blocky pixel-art character
  drawPlayer(player) {
    const { ctx } = this;
    const { x, y, width, height } = player;

    // Body — solid neon green block
    ctx.fillStyle = COLOURS.player;
    ctx.fillRect(x, y, width, height);

    // Left eye
    ctx.fillStyle = COLOURS.playerShadow;
    ctx.fillRect(x + 7,  y + 8, 7, 7);

    // Right eye
    ctx.fillRect(x + 22, y + 8, 7, 7);

    // Eye highlight dots (white) — makes the eyes readable at small sizes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 8,  y + 9, 3, 3);
    ctx.fillRect(x + 23, y + 9, 3, 3);

    // Mouth — a simple pixel grin
    ctx.fillStyle = COLOURS.playerShadow;
    ctx.fillRect(x + 9,  y + 22, 18, 3); // Bottom lip bar
    ctx.fillRect(x + 7,  y + 18, 4,  4); // Left corner
    ctx.fillRect(x + 25, y + 18, 4,  4); // Right corner
  }

  // Draw all platforms with a chunky 3-layer pixel style
  drawPlatforms(platforms) {
    const { ctx } = this;

    for (const p of platforms) {
      const { x, y, width, height } = p;

      // Main body
      ctx.fillStyle = COLOURS.platform;
      ctx.fillRect(x, y, width, height);

      // Top highlight stripe — 3px lighter band gives a raised edge feel
      ctx.fillStyle = COLOURS.platformShine;
      ctx.fillRect(x, y, width, 3);

      // Bottom shadow strip — 3px darker band for depth
      ctx.fillStyle = COLOURS.platformShadow;
      ctx.fillRect(x, y + height - 3, width, 3);
    }
  }
}
