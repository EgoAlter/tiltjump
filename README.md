# TiltJump

**[▶ Play it live](https://tiltjump.mr-csongor-nagy.workers.dev)**

A Doodle Jump-style mobile platformer built as a Progressive Web App. Tilt your iPhone left or right to steer the character upward across procedurally generated platforms.

---

## What this actually is

TiltJump is two experiments running in parallel.

### Experiment 1 — AI-assisted development with Claude Code

This project was built entirely through [Claude Code](https://claude.ai/code), used as a development partner rather than a code generator. The working method was deliberate: **stay at the architectural level, not the syntax level.** Every session started by naming design decisions before any code was written. The AI handled implementation; I handled orchestration — what to build, why, in what order, and how the pieces connect.

Things I used it for:
- Scaffolding a multi-file architecture from a spec
- Explaining sensor concepts before implementing them (not just writing the code)
- Debugging a post-game-over sensor failure that was non-obvious (listeners removed on game over, never re-attached on retry)
- Deploying to Cloudflare and getting HTTPS working for iOS sensor permissions

The takeaway: AI tooling is most useful when you bring the systems thinking and use the AI for the parts that are just mechanical translation of decisions into code. It falls apart if you skip the thinking and ask it to decide for you.

### Experiment 2 — PWA device sensor sandbox

The real technical goal was learning `DeviceOrientationEvent` and `DeviceMotionEvent` well enough to build a **cocktail shaker hospitality app** — a separate project that uses physical shaking and pouring gestures as input. TiltJump is the proof of concept. Every sensor decision was made with that future project in mind.

What was demonstrated and understood:

| Concept | What it means in practice |
|---|---|
| `DeviceOrientationEvent` gamma axis | Left/right tilt of a portrait phone — the steering axis |
| iOS 13+ permission gate | `requestPermission()` must be called from inside a user tap handler or iOS silently denies it — the #1 invisible failure in mobile sensor PWAs |
| Exponential moving average | `smoothed = α × raw + (1−α) × smoothed` — filters sensor noise without storing history |
| Calibration offset | Captures the player's natural hold angle at game start so "straight" always means straight |
| `DeviceMotionEvent` + `accelerationIncludingGravity` | Raw accelerometer output (always available, unlike the processed `acceleration` field which can be null) — used for shake magnitude detection |
| Stillness detection | Track last timestamp where motion exceeded a threshold — `isStill(ms)` returns true if nothing significant has happened in N ms |

---

## Stack

Vanilla JS · HTML Canvas · CSS — no frameworks, no libraries, no bundler.

The absence of dependencies is intentional. Every behaviour is traceable to a single readable function. The sensor module is designed to be copied and reused as-is.

---

## Sensor module design

`game/sensors.js` is a **standalone reusable library** — no game logic, no imports. Public API:

```js
SensorManager.requestPermission()   // iOS 13+ gate — call from inside a tap handler
SensorManager.startOrientation()    // Attach DeviceOrientationEvent listener
SensorManager.startMotion()         // Attach DeviceMotionEvent listener
SensorManager.calibrate()           // Capture current gamma as zero reference
SensorManager.getTilt()             // Smoothed, calibrated tilt: −1.0 (left) to +1.0 (right)
SensorManager.onShake(callback)     // Register shake callback (magnitude-based, with cooldown)
SensorManager.isStill(ms)           // True if no significant motion in last N ms
SensorManager.stop()                // Remove all listeners cleanly
```

This module transfers directly to the cocktail shaker project. `getTilt()` becomes tilt-to-pour. `onShake()` confirms mixing. `isStill()` detects when shaking has stopped.

---

## Running locally

```bash
git clone https://github.com/EgoAlter/tiltjump
cd tiltjump
python3 -m http.server 8765
# Desktop: open http://localhost:8765 — use ← → arrow keys to play
```

**For on-device testing (iOS sensor permissions require HTTPS):**

```bash
cloudflared tunnel --url http://localhost:8765
# Opens a temporary HTTPS URL — open it in Safari on iPhone
```

---

## Project sessions

| Session | Goal | Outcome |
|---|---|---|
| 1 | Scaffold full architecture | Game loop, platforms, physics, renderer, state machine |
| 2 | Wire real device sensors | Tilt steering on iPhone, iOS permission flow, debug HUD |
| 3 | Polish to presentable | Retro pixel style, platform colour tiers, proper screens |
| — | Bug fix | Sensors stopped after game over — listeners not re-attached on retry |
| — | Deploy | Live on Cloudflare, PWA installed to home screen |

---

## What's next

The cocktail shaker app — a hospitality PWA using the same sensor architecture:
- Shake detection → confirm ingredients are being mixed
- Tilt/pour gesture → animate liquid pouring into a glass  
- Stillness detection → know when shaking has stopped

The sensor module from this project is the foundation.
