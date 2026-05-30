// renderer.js — All canvas drawing. Pure visual output, no game logic.

// ── Palette ───────────────────────────────────────────────────────────────────
const BG       = '#0a0a1a';
const PLAYER   = '#00ff88';
const P_DARK   = '#003322'; // Player eye/mouth detail
const P_SHINE  = '#ffffff'; // Player eye highlight

// Platform colour tiers — body, top-shine, bottom-shadow.
// WHY three tiers: purely cosmetic variety that loosely reads as common/uncommon/rare
// without changing any collision or scoring logic. Renderer reads p.tier, nothing else does.
const PLATFORM_COLOURS = {
  common:   { body: '#ff6600', shine: '#ffaa44', shadow: '#882200' }, // 70% — neon orange
  uncommon: { body: '#00ccff', shine: '#88eeff', shadow: '#005588' }, // 20% — sky blue
  rare:     { body: '#ff44cc', shine: '#ff99ee', shadow: '#881166' }, // 10% — hot pink
};

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;

    // Pre-generate star positions once — drawn every frame at O(N) cost.
    // WHY static: stars don't scroll with the world (they're "infinitely far away").
    // Static stars read as a depth cue — background parallax at zero cost.
    this.stars = Array.from({ length: 50 }, () => ({
      x:    Math.floor(Math.random() * canvas.width),
      y:    Math.floor(Math.random() * canvas.height),
      size: Math.random() < 0.15 ? 2 : 1,
      // Vary brightness slightly so they don't all look the same
      alpha: 0.25 + Math.random() * 0.45,
    }));
  }

  // Clear and redraw background every frame
  clear() {
    const { ctx, canvas } = this;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Vertical scanlines — CRT retro flavour, very subtle
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let x = 0; x < canvas.width; x += 4) {
      ctx.fillRect(x, 0, 2, canvas.height);
    }
  }

  // Draw the player as a pixel-art character with antennae
  drawPlayer(player) {
    const { ctx } = this;
    const { x, y, width, height } = player;

    // Antennae — drawn above the body (purely cosmetic, above the collision box)
    ctx.fillStyle = PLAYER;
    ctx.fillRect(x + 7,  y - 7, 4, 7); // Left antenna shaft
    ctx.fillRect(x + 25, y - 7, 4, 7); // Right antenna shaft
    ctx.fillStyle = P_SHINE;
    ctx.fillRect(x + 7,  y - 7, 4, 3); // Left tip (white)
    ctx.fillRect(x + 25, y - 7, 4, 3); // Right tip (white)

    // Body
    ctx.fillStyle = PLAYER;
    ctx.fillRect(x, y, width, height);

    // Body highlight — tiny white pixel in top-left corner adds depth
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 2, y + 2, 6, 4);

    // Left eye socket + highlight
    ctx.fillStyle = P_DARK;
    ctx.fillRect(x + 7,  y + 9, 7, 7);
    ctx.fillStyle = P_SHINE;
    ctx.fillRect(x + 8,  y + 10, 3, 3);

    // Right eye socket + highlight
    ctx.fillStyle = P_DARK;
    ctx.fillRect(x + 22, y + 9, 7, 7);
    ctx.fillStyle = P_SHINE;
    ctx.fillRect(x + 23, y + 10, 3, 3);

    // Mouth — chunky pixel grin
    ctx.fillStyle = P_DARK;
    ctx.fillRect(x + 9,  y + 23, 18, 3); // Lip bar
    ctx.fillRect(x + 7,  y + 19, 4,  4); // Left cheek drop
    ctx.fillRect(x + 25, y + 19, 4,  4); // Right cheek drop
  }

  // Draw all platforms using tier-specific colour sets
  drawPlatforms(platforms) {
    const { ctx } = this;

    for (const p of platforms) {
      const c = PLATFORM_COLOURS[p.tier] ?? PLATFORM_COLOURS.common;
      const { x, y, width, height } = p;

      // Main body
      ctx.fillStyle = c.body;
      ctx.fillRect(x, y, width, height);

      // Top highlight — gives a raised, chunky feel
      ctx.fillStyle = c.shine;
      ctx.fillRect(x, y, width, 3);

      // Bottom shadow — adds depth
      ctx.fillStyle = c.shadow;
      ctx.fillRect(x, y + height - 3, width, 3);
    }
  }
}
