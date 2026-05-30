// hud.js — In-game heads-up display: score, high score, and debug sensor overlay.

export class HUD {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  // Draw score (top-left) and best score (top-right)
  draw(score) {
    const { ctx, canvas } = this;

    // Current score — top left
    ctx.textAlign = 'left';
    ctx.fillStyle = '#556655';
    ctx.font = `9px "Press Start 2P", monospace`;
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

  // Draw sensor debug overlay at the bottom of the screen.
  // Shows raw gamma, smoothed tilt, and permission state.
  // Essential for on-device sensor testing. Stripped in Session 5.
  //
  // data shape: { rawGamma, smoothed, calibOffset, permission }
  // (returned by SensorManager.debug())
  drawDebug(data) {
    const { ctx, canvas } = this;

    ctx.font = `7px "Press Start 2P", monospace`;
    ctx.textAlign = 'left';

    const y     = canvas.height - 10;
    const lineH = 14;

    // Line 1 — raw and smoothed tilt values
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - lineH * 2 - 8, canvas.width, lineH * 2 + 8);

    ctx.fillStyle = '#00cccc';
    ctx.fillText(
      `RAW γ:${data.rawGamma}°  TILT:${data.smoothed}  CAL:${data.calibOffset}°`,
      10,
      canvas.height - lineH - 4
    );

    // Line 2 — permission state
    const permColour = data.permission === 'GRANTED' ? '#00ff88'
                     : data.permission === 'DENIED'  ? '#ff4444'
                     : '#888888'; // N/A (desktop)
    ctx.fillStyle = permColour;
    ctx.fillText(`SENSOR PERM: ${data.permission}`, 10, canvas.height - 4);
  }
}
