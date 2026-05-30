# TiltJump — CLAUDE.md

## What this project is

TiltJump is a Doodle Jump-style arcade game built as a PWA (Progressive Web App), designed to be saved as a Safari bookmark and run as a near-native experience on iPhone. The player tilts their phone left/right to steer a character upward across procedurally generated platforms.

**This is not just a game.** It is a deliberate sensor API sandbox — a learning project to master `DeviceMotionEvent` and `DeviceOrientationEvent` in preparation for a separate hospitality product (a virtual cocktail shaker app). Every sensor-related decision should be made with that future project in mind.

## Developer context

- **Developer:** Jake — BSc Biochemistry graduate, self-taught developer, AI-assisted workflow
- **Primary device:** iPhone 12 Mini (Safari PWA, portrait orientation)
- **Dev machine:** MacBook Pro Early 2015, macOS, VSCode, Python 3, GitHub
- **Methodology:** AI-assisted development is an accepted working style — not a shortcut
- **Stack preference:** Vanilla JS, HTML, CSS — no frameworks unless there is a strong reason
- **Strength:** Systems thinking and architectural understanding, not syntax recall
- **Learning goal:** Understand *why* each sensor decision is made, not just *what* to write

## Primary learning objectives

These must be demonstrated and explained in code comments:

1. **`DeviceOrientationEvent`** — gamma axis (left/right tilt) for steering
2. **`DeviceMotionEvent`** — acceleration spike detection for shake (future shaker app)
3. **iOS 13+ permission flow** — sensors require explicit user gesture before `.requestPermission()` can be called; this will bite every Safari PWA if not handled correctly
4. **Sensor smoothing** — raw sensor data is noisy; exponential moving average or dead zone logic must be applied
5. **Calibration on game start** — capture baseline orientation so the player's natural hold angle is treated as "centre"
6. **PWA manifest + service worker** — offline-first, installable via Safari "Add to Home Screen"

## Architecture overview

```
tiltjump/
├── index.html          # Shell — loads manifest, registers service worker
├── manifest.json       # PWA manifest (name, icons, display: standalone, orientation: portrait)
├── sw.js               # Service worker — cache-first for all assets
├── app.js              # Entry point — permission flow, game init
├── game/
│   ├── engine.js       # Game loop (requestAnimationFrame), state machine
│   ├── sensors.js      # ALL sensor logic lives here — orientation, motion, smoothing, calibration
│   ├── player.js       # Player entity — position, velocity, collision
│   ├── platforms.js    # Procedural platform generation — normal, moving, disappearing
│   ├── renderer.js     # Canvas drawing — all visual output
│   └── score.js        # Score tracking, localStorage persistence, high score
├── ui/
│   ├── screens.js      # Screen state — splash, permission, playing, game-over
│   └── hud.js          # In-game HUD — score, high score overlay
└── assets/
    ├── icons/          # PWA icons (192x192, 512x512)
    └── sounds/         # Optional — jump SFX, land SFX (keep small)
```

**Why this structure:** Sensor logic is fully isolated in `sensors.js`. This is intentional — the cocktail shaker project will import a similar module. Treat `sensors.js` as a reusable library, not game-specific code.

## sensors.js — design contract

This file must export a clean API. Every function must have a comment explaining the *why*:

```js
// sensors.js public API
SensorManager.requestPermission()   // iOS 13+ — must be called from a user gesture handler
SensorManager.startOrientation()    // Begins DeviceOrientationEvent listener
SensorManager.startMotion()         // Begins DeviceMotionEvent listener (shake detection)
SensorManager.calibrate()           // Captures current gamma as the zero point
SensorManager.getTilt()             // Returns smoothed, calibrated tilt value (-1 to +1)
SensorManager.onShake(callback)     // Registers shake callback (threshold-based)
SensorManager.stop()                // Removes all listeners — call on game over / pause
```

Smoothing must use exponential moving average:
```js
smoothed = alpha * raw + (1 - alpha) * smoothed  // alpha ~0.15–0.25
```
Explain this in a comment. The cocktail shaker project will need this exact pattern.

## PWA requirements

- `manifest.json`: `"display": "standalone"`, `"orientation": "portrait"`, `"start_url": "/"`, icons at 192 and 512
- `sw.js`: cache-first strategy, cache all game assets on install
- `index.html`: `<meta name="apple-mobile-web-app-capable" content="yes">` and related Apple-specific meta tags
- Canvas must fill the viewport — `width: 100vw; height: 100vh` with `touch-action: none` to prevent scroll hijack

## iOS permission flow — critical

iOS 13+ requires `DeviceOrientationEvent.requestPermission()` to be called **inside a user gesture handler** (tap). It cannot be called on page load. The game must:

1. Show a splash/permission screen
2. User taps a button
3. Inside that tap handler: call `requestPermission()`
4. On success: proceed to game
5. On denial: show a fallback message explaining why the game needs sensors

Do not skip this. It will silently fail on every iPhone if not implemented.

## Game design spec

- **Viewport:** Portrait canvas, full screen
- **Physics:** Constant upward bounce on platform contact, gravity pulls player down, horizontal wrap-around (exit left = enter right)
- **Camera:** World scrolls down — player must keep climbing or falls off screen = death
- **Platform types (introduce progressively):**
  - Static (always present at start)
  - Moving (horizontal oscillation, introduced ~score 500)
  - Disappearing (one-jump only, introduced ~score 1000)
- **Scoring:** Based on max height reached — not time
- **High score:** Persisted in `localStorage`
- **Visual style:** Retro pixel / arcade — chunky pixels, limited colour palette, scanline feel. Use a pixel font (e.g. Press Start 2P from Google Fonts). Dark background. Neon accent colours.

## Code style and comments

- Every function must have a one-line comment explaining its purpose
- Every sensor decision must have a comment explaining *why* (not just *what*)
- Architectural decisions (e.g. "why canvas not DOM", "why EMA not raw value") must be explained inline
- Jake is learning — write code that teaches, not just code that works
- Prefer clarity over cleverness

## What NOT to do

- Do not use React, Vue, or any JS framework — this is a vanilla JS learning project
- Do not use a physics library (Matter.js etc.) — implement simple physics manually to understand it
- Do not skip the permission flow to "test faster" — it must work correctly on iOS from the start
- Do not hardcode canvas dimensions — always derive from `window.innerWidth` / `window.innerHeight`
- Do not use `alert()` for anything — all UI is canvas or HTML overlay

## Future project context (cocktail shaker app)

The sensors learned here will power a hospitality PWA:
- Shake detection (`DeviceMotionEvent`) → confirm cocktail ingredients are being mixed
- Stillness detection → know when shaking has stopped
- Tilt/pour gesture (`DeviceOrientationEvent`) → animate pouring into glass
- Same iOS permission flow applies
- Same PWA offline-first pattern applies

When making sensor decisions, ask: *will this pattern transfer cleanly to the shaker app?* If yes, that's the right decision.

## Session startup checklist

When starting a new Claude Code session on this project:
1. Read this file in full
2. Check current file structure with `ls -R`
3. Ask Jake what the session goal is before writing any code
4. Name the architectural decision before implementing it
5. If touching `sensors.js`, explain the sensor concept before writing the function
