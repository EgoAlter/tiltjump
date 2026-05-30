// hud.js — In-game heads-up display: score and high score overlay.
// Drawn on top of the game world every frame while PLAYING.

export class HUD {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  // Draw score (top-left) and best score (top-right)
  draw(score) {
    const { ctx, canvas } = this;

    ctx.font = `9px "Press Start 2P", monospace`;

    // Current score — top left
    ctx.textAlign = 'left';
    ctx.fillStyle = '#556655';
    ctx.fillText('SCORE', 14, 22);
    ctx.fillStyle = '#00ff88';
    ctx.font = `11px "Press Start 2P", monospace`;
    ctx.fillText(String(score.current), 14, 38);

    // High score — top right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#556655';
    ctx.font = `9px "Press Start 2P", monospace`;
    ctx.fillText('BEST', canvas.width - 14, 22);
    ctx.fillStyle = '#ffff00';
    ctx.font = `11px "Press Start 2P", monospace`;
    ctx.fillText(String(score.high), canvas.width - 14, 38);
  }
}
