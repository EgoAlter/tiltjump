// screens.js — Full-screen canvas UI for non-gameplay states.

export class Screens {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  // ── Splash / title screen ──────────────────────────────────────────────────
  drawSplash() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    ctx.textAlign = 'center';

    // ── Title ──
    // Drop-shadow technique: draw the text twice — dark offset first, then bright on top.
    // Gives the title a lifted, lit-from-above quality at zero cost.
    const titleSize = Math.min(28, Math.floor(canvas.width / 11));
    ctx.font = `${titleSize}px "Press Start 2P", monospace`;

    ctx.fillStyle = '#003322'; // Shadow
    ctx.fillText('TILTJUMP', cx + 3, canvas.height * 0.26 + 3);

    ctx.fillStyle = '#00ff88'; // Main title
    ctx.fillText('TILTJUMP', cx, canvas.height * 0.26);

    // ── Dot separator ──
    const dotY  = Math.floor(canvas.height * 0.32);
    const dotSz = 4;
    ctx.fillStyle = '#224422';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(Math.floor(cx) + i * 11 - dotSz / 2, dotY, dotSz, dotSz);
    }

    // ── Subtitle ──
    ctx.fillStyle = '#2d5a2d';
    ctx.font = `8px "Press Start 2P", monospace`;
    ctx.fillText('REACH THE SKY', cx, canvas.height * 0.38);

    // ── Mini preview scene — two platforms + player silhouette ──
    // Gives first-time visitors an immediate read of what the game looks like.
    this._drawPreviewScene(cx, Math.floor(canvas.height * 0.50));

    // ── Tap prompt (blinks every 600ms) ──
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `12px "Press Start 2P", monospace`;
      ctx.fillText('TAP TO START', cx, canvas.height * 0.68);
    }

    // ── Tilt instruction ──
    ctx.fillStyle = '#335533';
    ctx.font = `8px "Press Start 2P", monospace`;
    ctx.fillText('TILT YOUR PHONE TO MOVE', cx, canvas.height * 0.77);

    // ── Desktop keyboard hint — very muted, secondary info ──
    ctx.fillStyle = '#1a2e1a';
    ctx.font = `7px "Press Start 2P", monospace`;
    ctx.fillText('← →  KEYBOARD ON DESKTOP', cx, canvas.height * 0.88);
  }

  // Small decorative platform scene drawn on the splash screen.
  // Mimics in-game visuals so players know what to expect before tapping.
  _drawPreviewScene(cx, centreY) {
    const { ctx } = this;

    // Left platform (common — orange)
    const lx = cx - 85, ly = centreY + 10;
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(lx, ly, 65, 10);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(lx, ly, 65, 3);

    // Right platform (uncommon — cyan), higher and offset right
    const rx = cx + 26, ry = centreY - 16;
    ctx.fillStyle = '#00ccff';
    ctx.fillRect(rx, ry, 58, 10);
    ctx.fillStyle = '#88eeff';
    ctx.fillRect(rx, ry, 58, 3);

    // Player silhouette sitting on the left platform
    const px = lx + 18, py = ly - 22;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(px,      py,      22, 22); // Body
    ctx.fillStyle = '#003322';
    ctx.fillRect(px + 4,  py + 6,  5,  5); // Left eye
    ctx.fillRect(px + 13, py + 6,  5,  5); // Right eye
    ctx.fillRect(px + 4,  py + 15, 14, 3); // Mouth
    // Antennae
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(px + 3,  py - 5, 3, 5);
    ctx.fillRect(px + 16, py - 5, 3, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 3,  py - 5, 3, 2); // Tips
    ctx.fillRect(px + 16, py - 5, 3, 2);
  }

  // ── Permission screen ──────────────────────────────────────────────────────
  // Shown briefly while requestPermission() resolves on iOS.
  // The OS dialog appears on top — this just fills the background.
  drawPermission() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffff00';
    ctx.font = `14px "Press Start 2P", monospace`;
    ctx.fillText('ALLOW TILT?', cx, canvas.height * 0.40);

    ctx.fillStyle = '#555577';
    ctx.font = `7px "Press Start 2P", monospace`;
    ctx.fillText('SENSORS NEEDED TO PLAY', cx, canvas.height * 0.52);
    ctx.fillText('ON MOBILE', cx, canvas.height * 0.60);
    ctx.fillText('(KEYBOARD WORKS ON DESKTOP)', cx, canvas.height * 0.72);
  }

  // ── Game over screen ───────────────────────────────────────────────────────
  drawGameOver(score) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    // Semi-transparent overlay — frozen game world shows through for context
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';

    // ── "GAME OVER" with ruled lines each side ──
    // Rule + text + rule is a classic print/zine layout that reads instantly as a header.
    const headSize = Math.min(20, Math.floor(canvas.width / 16));
    ctx.font = `${headSize}px "Press Start 2P", monospace`;
    const headY = canvas.height * 0.27;

    ctx.fillStyle = '#ff4444';
    ctx.fillText('GAME OVER', cx, headY);

    // Measure rendered width so rules butt up against the text precisely
    const tw  = ctx.measureText('GAME OVER').width;
    const gap = 10;
    const lineY = headY - headSize * 0.35; // Vertically centre with cap height
    ctx.fillStyle = '#661111';
    ctx.fillRect(14,              lineY, cx - tw / 2 - gap - 14, 2); // Left rule
    ctx.fillRect(cx + tw / 2 + gap, lineY, canvas.width - (cx + tw / 2 + gap) - 14, 2); // Right rule

    // ── Score block ──
    ctx.font = `8px "Press Start 2P", monospace`;
    ctx.fillStyle = '#335533';
    ctx.fillText('HEIGHT', cx, canvas.height * 0.40);

    ctx.font = `${Math.min(18, Math.floor(canvas.width / 18))}px "Press Start 2P", monospace`;
    ctx.fillStyle = '#00ff88';
    ctx.fillText(String(score.current), cx, canvas.height * 0.50);

    // ── Best score block ──
    ctx.font = `8px "Press Start 2P", monospace`;
    ctx.fillStyle = '#554400';
    ctx.fillText('BEST', cx, canvas.height * 0.60);

    ctx.font = `${Math.min(18, Math.floor(canvas.width / 18))}px "Press Start 2P", monospace`;
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(String(score.high), cx, canvas.height * 0.70);

    // ── New record callout (blinks) ──
    if (score.current > 0 && score.current === score.high) {
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#00ff88';
        ctx.font = `9px "Press Start 2P", monospace`;
        ctx.fillText('★  NEW RECORD  ★', cx, canvas.height * 0.79);
      }
    }

    // ── Retry prompt (blinks) ──
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillStyle = '#aaaaaa';
      ctx.font = `9px "Press Start 2P", monospace`;
      ctx.fillText('TAP TO PLAY AGAIN', cx, canvas.height * 0.89);
    }
  }
}
