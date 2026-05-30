// sensors.js — Device sensor management.
//
// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
// This file is a standalone library. It knows nothing about the game world —
// no players, no platforms, no score. It accepts raw hardware events and
// returns clean, normalised values. The game engine calls SensorManager.getTilt()
// and does not care whether the value came from a gyroscope or a keyboard.
//
// The same module pattern will be used directly in the cocktail shaker app.
// Treat this API shape as a contract, not an implementation detail.
//
// SESSION 1 STUB:
// Real sensor events are not wired up yet. The stub:
//   - Reads arrow key state for desktop testing
//   - Returns the same shaped data the real sensors will return
//   - Applies real EMA smoothing even now, so we can test the feel
// ═══════════════════════════════════════════════════════════════════════════════

// --- Internal state ---

// Smoothed tilt value, persisted across frames.
// WHY a module-level variable (not a class property): SensorManager is a singleton.
// There is only ever one sensor system per app. A plain object with closure state
// is cleaner than a class you'd only ever instantiate once.
let _smoothedTilt = 0;

// The gamma angle recorded at game start — used to zero-out the player's natural hold angle.
// WHY needed: if a player holds their phone at 12° naturally, without calibration
// they'd experience constant 12° of tilt before they've moved. Calibration makes
// "however you hold it" = zero.
let _calibrationOffset = 0;

// Whether the OS has granted sensor permission (iOS 13+ gate).
let _permissionGranted = false;

// Registered shake callback — invoked when shake threshold is crossed.
let _shakeCallback = null;

// The latest raw gamma value from the deviceorientation event.
// Updated by the event listener; read by getTilt().
let _rawGamma = 0;

// Keyboard state for desktop fallback testing.
// Arrow keys map to a simulated tilt value.
const _keys = { ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', e => { if (e.key in _keys) _keys[e.key] = true; });
window.addEventListener('keyup',   e => { if (e.key in _keys) _keys[e.key] = false; });

// Bound event handler references — stored here so stop() can remove them.
// WHY store references: addEventListener and removeEventListener must receive the
// SAME function object. Arrow functions create a new object each time, so you
// cannot remove a listener added with an arrow function unless you saved the reference.
let _orientationHandler = null;
let _motionHandler      = null;


// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export const SensorManager = {

  // ─── requestPermission() ───────────────────────────────────────────────────
  // Ask the OS for permission to read device sensors.
  //
  // iOS 13+ CRITICAL RULE:
  //   DeviceOrientationEvent.requestPermission() MUST be called inside a user
  //   gesture handler (a tap or click). If called at any other time — on page
  //   load, in a setTimeout, after an await that breaks the gesture chain — iOS
  //   silently returns 'denied' without showing the permission dialog.
  //   This is the #1 reason sensor-based PWAs fail on iPhone.
  //
  // REAL IMPLEMENTATION (next session):
  //   if (typeof DeviceOrientationEvent.requestPermission === 'function') {
  //     const result = await DeviceOrientationEvent.requestPermission();
  //     // result is 'granted' or 'denied'
  //     _permissionGranted = result === 'granted';
  //   } else {
  //     // Non-iOS browsers don't require permission — sensors are always available
  //     _permissionGranted = true;
  //   }
  //
  // COCKTAIL SHAKER NOTE:
  //   Identical flow required. requestPermission() must be in the "Shake to Mix"
  //   button handler, not in app initialisation.
  async requestPermission() {
    // STUB: Always grant — no OS dialog on desktop
    _permissionGranted = true;
    console.log('[SensorManager] STUB: permission granted (no real sensor check)');
    return true;
  },

  // ─── startOrientation() ────────────────────────────────────────────────────
  // Begin listening to DeviceOrientationEvent for tilt data.
  //
  // REAL IMPLEMENTATION (next session):
  //   The 'deviceorientation' event fires approximately 60 times per second.
  //   Each event has three Euler angle properties:
  //     event.alpha — rotation around Z axis (0–360°, compass-style). We don't use this.
  //     event.beta  — front-to-back tilt (−180 to +180°). Useful for pour gesture.
  //     event.gamma — left-right tilt (−90 to +90°). THIS is what steers the player.
  //
  //   The handler just stores the raw value. getTilt() does the processing.
  //   WHY separate reading from processing: the event fires on its own schedule;
  //   getTilt() is called on the game loop schedule. We don't want processing
  //   logic tied to the event frequency.
  //
  // COCKTAIL SHAKER NOTE:
  //   beta (front-back tilt) is the "pour" gesture for the shaker app.
  //   gamma (left-right) is less relevant there. Same listener, different axis.
  startOrientation() {
    // STUB: The keyboard fallback in getTilt() handles input — no listener needed
    console.log('[SensorManager] STUB: orientation active via keyboard (← → arrows)');
  },

  // ─── startMotion() ─────────────────────────────────────────────────────────
  // Begin listening to DeviceMotionEvent for shake detection.
  //
  // THIS IS THE KEY API FOR THE COCKTAIL SHAKER APP.
  //
  // REAL IMPLEMENTATION (next session):
  //   The 'devicemotion' event also fires ~60 times per second.
  //   event.accelerationIncludingGravity provides {x, y, z} in m/s².
  //   "IncludingGravity" means even a stationary phone reads ~9.8 m/s² on one axis.
  //
  //   Shake detection algorithm:
  //     1. Compute magnitude: Math.sqrt(x² + y² + z²)
  //     2. If magnitude > SHAKE_THRESHOLD (e.g. 25 m/s²), it's a shake
  //     3. Apply a cooldown (e.g. 500ms) so one shake doesn't trigger 30 times
  //     4. Call _shakeCallback() when triggered
  //
  //   WHY magnitude not a single axis: shaking a phone happens in multiple
  //   directions simultaneously. A single-axis check misses diagonal shakes.
  //
  // COCKTAIL SHAKER NOTE:
  //   onShake() wires up to this. The shaker app calls onShake(() => confirmMix()).
  //   Direct reuse — no changes needed to this file's API.
  startMotion() {
    // STUB: No-op
    console.log('[SensorManager] STUB: motion/shake detection not active yet');
  },

  // ─── calibrate() ───────────────────────────────────────────────────────────
  // Capture the current tilt angle as the "neutral" position.
  //
  // Called at the start of each game, so the player's natural phone hold angle
  // is treated as "zero tilt" regardless of what angle that actually is.
  //
  // REAL IMPLEMENTATION (next session):
  //   _calibrationOffset = _rawGamma;
  //   That single line is the entire implementation. Then in getTilt():
  //     adjustedGamma = _rawGamma - _calibrationOffset
  //   ensures that whatever gamma was at calibration time = 0 in game terms.
  //
  // COCKTAIL SHAKER NOTE:
  //   Same pattern applies — calibrate on app open so "at rest on the bar"
  //   reads as a neutral pour angle.
  calibrate() {
    // STUB: Keyboard has no angle, so offset stays 0
    _calibrationOffset = 0;
    console.log('[SensorManager] STUB: calibration offset = 0 (keyboard mode)');
  },

  // ─── getTilt() ─────────────────────────────────────────────────────────────
  // Return a smoothed, calibrated tilt value in the range −1.0 to +1.0.
  // Negative = leaning left. Positive = leaning right. Zero = upright.
  //
  // This is the only function the game engine ever calls for steering input.
  // It is called once per frame, ~60 times per second.
  //
  // REAL IMPLEMENTATION (next session):
  //   Step 1 — Adjust for calibration:
  //     const adjusted = _rawGamma - _calibrationOffset;
  //
  //   Step 2 — Clamp to ±45°:
  //     The sensor can read up to ±90° but gameplay only needs ±45°.
  //     Clamping prevents extreme tilts from making the player rocket off-screen.
  //     const clamped = Math.max(-45, Math.min(45, adjusted));
  //
  //   Step 3 — Normalise to −1..+1:
  //     const normalised = clamped / 45;
  //
  //   Step 4 — Apply exponential moving average (EMA) smoothing:
  //     _smoothedTilt = ALPHA * normalised + (1 - ALPHA) * _smoothedTilt;
  //
  //   Step 5 — Return smoothedTilt.
  //
  // ── WHY EXPONENTIAL MOVING AVERAGE? ──────────────────────────────────────
  // Raw sensor readings look like this over consecutive frames:
  //   12°, 9°, 14°, 11°, 16°, 10°, 15° ...
  // The phone hasn't moved — that's just sensor noise. If we fed these directly
  // to the player, they'd jitter left-right 60 times a second.
  //
  // EMA blends each new reading with the previous smoothed value:
  //   smoothed = alpha × new_value + (1 − alpha) × previous_smoothed
  //
  // With alpha = 0.2:
  //   Frame 1: smoothed = 0.2 × 12 + 0.8 × 0  = 2.4
  //   Frame 2: smoothed = 0.2 × 9  + 0.8 × 2.4 = 3.72
  //   Frame 3: smoothed = 0.2 × 14 + 0.8 × 3.72 = 5.78
  //
  // The output rises gradually toward the real signal, filtering out the noise.
  // alpha = 0.1 → very smooth, more lag (response feels heavy)
  // alpha = 0.3 → more responsive, more jitter
  // alpha ≈ 0.2 is the sweet spot for a tilt-steering game.
  //
  // This exact formula transfers directly to the cocktail shaker app for
  // smoothing shake magnitude before comparing to the detection threshold.
  // ─────────────────────────────────────────────────────────────────────────
  getTilt() {
    const ALPHA = 0.2; // EMA smoothing factor — see explanation above

    // STUB: Simulate tilt from keyboard arrow keys.
    // 0.6 not 1.0 — full ±1 feels twitchy; 0.6 is more natural.
    // The EMA still runs, so holding the key produces gradual acceleration
    // and releasing produces gradual deceleration — exactly like real tilt.
    let raw = 0;
    if (_keys.ArrowLeft)  raw = -0.6;
    if (_keys.ArrowRight) raw =  0.6;

    // Apply EMA: blend new input with running average
    _smoothedTilt = ALPHA * raw + (1 - ALPHA) * _smoothedTilt;

    return _smoothedTilt;
  },

  // ─── onShake(callback) ─────────────────────────────────────────────────────
  // Register a function to be called when a shake gesture is detected.
  //
  // REAL IMPLEMENTATION: callback is invoked by the devicemotion handler
  // when acceleration magnitude exceeds the shake threshold. The callback
  // receives the shake intensity (optional — could be used to grade cocktail mixing).
  //
  // COCKTAIL SHAKER USE:
  //   SensorManager.onShake(() => { confirmIngredientsMixed(); });
  //   Direct reuse — this is precisely the API the shaker app needs.
  onShake(callback) {
    _shakeCallback = callback;
    // STUB: callback registered but will never fire (no motion listener active)
    console.log('[SensorManager] STUB: shake callback registered (not active yet)');
  },

  // ─── stop() ────────────────────────────────────────────────────────────────
  // Remove all event listeners and reset internal state.
  //
  // Call this on: game over, pause, page visibility change (tab hidden).
  //
  // WHY important: device sensor listeners fire continuously even when the game
  // isn't running. On mobile this drains battery and heats the device.
  // A good sensor library ALWAYS exposes a stop() method.
  //
  // REAL IMPLEMENTATION:
  //   window.removeEventListener('deviceorientation', _orientationHandler);
  //   window.removeEventListener('devicemotion',      _motionHandler);
  //   _orientationHandler = null;
  //   _motionHandler      = null;
  //
  // COCKTAIL SHAKER NOTE:
  //   Call stop() when the app goes to background (visibilitychange event).
  //   iOS may suspend the app but the listeners stay alive until explicitly removed.
  stop() {
    if (_orientationHandler) {
      window.removeEventListener('deviceorientation', _orientationHandler);
      _orientationHandler = null;
    }
    if (_motionHandler) {
      window.removeEventListener('devicemotion', _motionHandler);
      _motionHandler = null;
    }
    _smoothedTilt = 0;
    console.log('[SensorManager] Stopped (listeners removed, state reset)');
  },
};
