// app.js — Entry point. Wires together the canvas, service worker, and game engine.

import { Engine } from './game/engine.js';

// Register the service worker for offline-first PWA capability.
// 'serviceWorker' in navigator guards against environments where SW isn't supported
// (e.g. non-HTTPS, very old browsers, or local file:// protocol).
// NOTE: SW requires HTTPS in production. Localhost is the one allowed exception.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('[SW] Registered'))
    .catch(err => console.warn('[SW] Registration failed:', err));
}

const canvas = document.getElementById('gameCanvas');

// Set the canvas DRAWING BUFFER to match the display size.
// WHY two separate sizes?
//   CSS (width: 100vw; height: 100vh) controls the DISPLAYED size on screen.
//   canvas.width / canvas.height control the PIXEL BUFFER — the resolution we
//   draw into. Without setting these, the buffer defaults to 300×150 (the HTML spec
//   default), and the browser stretches it to fill the screen — blurry mess.
// We set them to window.innerWidth/Height so 1 canvas pixel = 1 CSS pixel.
// On a Retina / high-DPI display you could multiply by devicePixelRatio for
// crisper output, but that adds complexity — leaving it for a future session.
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Wait for fonts to load before starting the engine.
// WHY: canvas.fillText() draws with whatever font is CURRENTLY available.
// If 'Press Start 2P' hasn't loaded yet, the first frames render in the fallback
// monospace font — then it "pops" to the pixel font mid-game, which looks broken.
// document.fonts.ready resolves after all <link> font loads complete (or fail).
document.fonts.ready.then(() => {
  const engine = new Engine(canvas);
  engine.start();
});
