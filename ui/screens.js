// screens.js — Full-screen canvas UI for non-gameplay states.
// Splash, permission request, and game over are all drawn here.

export class Screens {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;
  }

  // Draw the title/splash screen — shown on first load
  drawSplash() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    ctx.textAlign = 'center';

    // Game title
    ctx.fillStyle = '#00ff88';
    ctx.font = `${Math.min(26, canvas.width / 12)}px "Press Start 2P", monospace`;
    ctx.fillText('TILTJUMP', cx, canvas.height * 0.32);

    // Tagline
    ctx.fillStyle = '#446644';
    ctx.font = `9px "Press Start 2P", monospace`;
    ctx.fillText('A SENSOR SANDBOX', cx, canvas.height * 0.42);

    // Blinking "tap to start" prompt — toggles every 600ms
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `12px "Press Start 2P", monospace`;
      ctx.fillText('TAP TO START', cx, canvas.height * 0.62);
    }

    // Keyboard hint for desktop testing
    ctx.fillStyle = '#333355';
    ctx.font = `7px "Press Start 2P", monospace`;
    ctx.fillText('← →  ARROW KEYS ON DESKTOP', cx, canvas.height * 0.84);
  }

  // Draw the permission screen — shown briefly while requestPermission() resolves.
  // On real iOS, the OS permission dialog appears on top of this screen.
  drawPermission() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffff00';
    ctx.font = `14px "Press Start 2P", monospace`;
    ctx.fillText('ALLOW TILT?', cx, canvas.height * 0.40);

    ctx.fillStyle = '#666688';
    ctx.font = `7px "Press Start 2P", monospace`;
    ctx.fillText('SENSORS NEEDED TO PLAY', cx, canvas.height * 0.52);
    ctx.fillText('ON MOBILE', cx, canvas.height * 0.60);
    ctx.fillText('(KEYBOARD WORKS ON DESKTOP)', cx, canvas.height * 0.72);
  }

  // Draw the game-over overlay — shown on top of the frozen game world
  drawGameOver(score) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;

    // Dark translucent overlay — lets the frozen platform world show through
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';

    // "Game Over" title
    ctx.fillStyle = '#ff4444';
    ctx.font = `${Math.min(22, canvas.width / 14)}px "Press Start 2P", monospace`;
    ctx.fillText('GAME OVER', cx, canvas.height * 0.30);

    // Score summary
    ctx.font = `11px "Press Start 2P", monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`SCORE  ${score.current}`, cx, canvas.height * 0.46);

    ctx.fillStyle = '#ffff00';
    ctx.fillText(`BEST   ${score.high}`, cx, canvas.height * 0.56);

    // New high score callout
    if (score.current > 0 && score.current === score.high) {
      ctx.fillStyle = '#00ff88';
      ctx.font = `9px "Press Start 2P", monospace`;
      ctx.fillText('NEW RECORD!', cx, canvas.height * 0.65);
    }

    // Blinking retry prompt
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `10px "Press Start 2P", monospace`;
      ctx.fillText('TAP TO RETRY', cx, canvas.height * 0.76);
    }
  }
}
