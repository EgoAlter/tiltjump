// hud.js — In-game heads-up display: score and high score overlay.

export class HUD {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  // Draw score (top-left) and best score (top-right)
  draw(score) {
    const { ctx, canvas } = this;

    // Label row
    ctx.font = `8px "Press Start 2P", monospace`;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#2d5a2d';
    ctx.fillText('SCORE', 14, 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#554400';
    ctx.fillText('BEST', canvas.width - 14, 22);

    // Value row
    ctx.font = `11px "Press Start 2P", monospace`;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(String(score.current), 14, 38);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(String(score.high), canvas.width - 14, 38);
  }
}
