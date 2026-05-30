// sensors.js — Device sensor management.
//
// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
// Standalone library — no game logic, no imports, no knowledge of platforms or
// players. Accepts raw hardware events, returns clean normalised values.
//
// The cocktail shaker app will import this exact module.
// The public API shape is a contract — do not break it.
//
// MODULE PATTERN: SensorManager is a singleton object with closure state.
// There is only ever one sensor system per app. A plain exported object is
// cleaner than a class you'd only ever instantiate once.
// ═══════════════════════════════════════════════════════════════════════════════


// ── Constants ─────────────────────────────────────────────────────────────────

// EMA smoothing factor. Each new reading contributes TILT_ALPHA of the output;
// the previous smoothed value contributes (1 − TILT_ALPHA). See getTilt() for
// the full explanation of why EMA, not a rolling average.
const TILT_ALPHA = 0.2;

// We clamp raw gamma to ±45° before normalising.
// WHY 45 and not 90: gamma range is ±90° but beyond ±45° is an extreme tilt
// that isn't practical gameplay. Clamping keeps the normalised value meaningful
// and prevents tiny angle changes near vertical from moving the player wildly.
const TILT_MAX_DEG = 45;

// Shake detection threshold in m/s² (accelerationIncludingGravity magnitude).
// A stationary phone reads ~9.8 (gravity). A vigorous shake peaks at 25–40+.
// 20 sits comfortably above background gravity without false positives from
// minor bumps or table vibration.
const SHAKE_THRESHOLD = 20;

// "Phone is moving" threshold for isStill(). Lower than SHAKE_THRESHOLD so
// slow, deliberate movement counts as motion even if it's not a shake.
// ~12 m/s² is clearly above the 9.8 resting baseline.
const MOTION_THRESHOLD = 12;

// After a shake fires, ignore further shakes for this many ms.
// WHY: one physical shake gesture takes 200–400ms. Without cooldown, a single
// shake fires the callback 10–20 times across consecutive event frames.
const SHAKE_COOLDOWN_MS = 500;


// ── Internal state ─────────────────────────────────────────────────────────────

let _smoothedTilt        = 0;
let _rawGamma            = 0;      // Latest value from deviceorientation event
let _calibrationOffset   = 0;      // Gamma captured at calibration — subtracted from readings
let _permissionGranted   = false;
let _shakeCallback       = null;
let _lastShakeTime       = 0;      // Timestamp of last fired shake callback
let _lastMotionTimestamp = 0;      // Timestamp of last reading above MOTION_THRESHOLD

// Stored listener references — REQUIRED for removeEventListener. See stop().
let _orientationHandler  = null;
let _motionHandler       = null;


// ── Keyboard fallback (desktop testing) ───────────────────────────────────────
// When arrow keys are held, getTilt() returns a keyboard value instead of the
// sensor value. This means the game is fully playable on desktop without sensors.
// The keyboard path and sensor path return the same shaped data — the engine
// and player never know which is active.
const _keys = { ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', e => { if (e.key in _keys) _keys[e.key] = true; });
window.addEventListener('keyup',   e => { if (e.key in _keys) _keys[e.key] = false; });


// ── iOS feature detect ────────────────────────────────────────────────────────
// DeviceOrientationEvent.requestPermission() only exists on iOS 13+.
// Android and desktop expose sensors unconditionally — no permission API.
// We check at module load time so the runtime path is clear.
const _iosPermissionRequired =
  typeof DeviceOrientationEvent !== 'undefined' &&
  typeof DeviceOrientationEvent.requestPermission === 'function';


// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export const SensorManager = {

  // ─── requestPermission() ────────────────────────────────────────────────────
  // Ask the OS for permission to access device orientation (and optionally motion).
  // Returns a Promise<boolean> — true if orientation permission was granted.
  //
  // ── WHY THIS MUST BE CALLED FROM INSIDE A USER GESTURE ───────────────────
  // iOS Safari internally tracks "user activation state" — whether the current
  // execution context was initiated by a real user interaction (tap, click).
  //
  // DeviceOrientationEvent.requestPermission() is intentionally gated behind
  // this state. It is designed to show the system-level permission dialog
  // ("TiltJump would like to use your motion and orientation"), but iOS will
  // only show that dialog if the call originates from a user gesture.
  //
  // If you call it at any other time — on page load, in a setTimeout, after an
  // unrelated await — iOS returns 'denied' silently. No error thrown, no dialog
  // shown, no indication anything went wrong. The sensors just don't work.
  // This is the #1 cause of silent sensor failure in iOS PWAs.
  //
  // Our async/await chain preserves the gesture context:
  //   tap → handleTap() → _requestSensorPermission() → await requestPermission()
  //   → requestPermission() → await DeviceOrientationEvent.requestPermission()
  // Each await suspends into a microtask, but iOS tracks the gesture through
  // the entire Promise chain as long as the chain originates from the tap.
  //
  // COCKTAIL SHAKER NOTE: the "Shake to Mix" button tap must be the trigger.
  // requestPermission() belongs in the button's click handler, not in app init.
  async requestPermission() {
    if (!_iosPermissionRequired) {
      // Android / desktop: sensors available without any permission call
      _permissionGranted = true;
      console.log('[SensorManager] Non-iOS: sensors available without permission');
      return true;
    }

    // iOS 13+ path — request orientation permission first (required for gameplay)
    try {
      const orientResult = await DeviceOrientationEvent.requestPermission();
      _permissionGranted = orientResult === 'granted';
    } catch (err) {
      // Throws if called outside a gesture — shouldn't happen with our setup
      console.warn('[SensorManager] Orientation permission threw:', err);
      _permissionGranted = false;
    }

    // Request motion permission separately — iOS requires individual calls.
    // Motion is used for shake detection. If denied, gameplay still works
    // (just no shake feature), so we don't let this block _permissionGranted.
    if (_permissionGranted && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const motionResult = await DeviceMotionEvent.requestPermission();
        if (motionResult !== 'granted') {
          console.warn('[SensorManager] Motion permission denied — shake detection disabled');
        }
      } catch (err) {
        console.warn('[SensorManager] Motion permission threw:', err);
      }
    }

    console.log('[SensorManager] Permission:', _permissionGranted ? 'granted' : 'denied');
    return _permissionGranted;
  },

  // ─── startOrientation() ─────────────────────────────────────────────────────
  // Attach a deviceorientation listener and begin storing gamma values.
  //
  // ── WHY GAMMA AND NOT ALPHA OR BETA ──────────────────────────────────────
  // DeviceOrientationEvent describes the phone's rotation in 3D using three
  // Euler angles — think of them as three different axes to spin around:
  //
  //   alpha (0°–360°) — rotation around the Z axis (the axis pointing straight
  //     out of the screen toward your face). This is the "compass heading" — it
  //     changes when you spin the phone flat on a table. Useless for steering.
  //
  //   beta (−180° to +180°) — rotation around the X axis (the left-right
  //     horizontal axis). This is FRONT-BACK tilt — tilting the top of the phone
  //     toward you or away from you, like nodding yes. For the cocktail shaker
  //     app this is the "pour" gesture.
  //
  //   gamma (−90° to +90°) — rotation around the Y axis (the top-bottom vertical
  //     axis). This is LEFT-RIGHT tilt — tilting left or right, like shaking your
  //     head no. When you hold an iPhone in portrait and tilt it to steer, THIS
  //     is the angle that changes. Rightward tilt → positive gamma. Left → negative.
  //
  // So: tilt phone right 30° → gamma ≈ +30°. Tilt left 30° → gamma ≈ −30°.
  // That maps directly to "move right" / "move left".
  //
  // WHY the handler just stores the value instead of processing it:
  // The event fires on the hardware sensor schedule (~60Hz). getTilt() is called
  // on the game loop's rAF schedule (~60fps). These schedules are NOT synchronised.
  // By decoupling them — event writes _rawGamma, game loop reads _rawGamma —
  // both can run at their own rate without any blocking or queue management.
  //
  // COCKTAIL SHAKER NOTE: same listener, but read event.beta for the pour gesture.
  startOrientation() {
    // Guard: if a handler is already attached, don't add a second one.
    // A second addEventListener with a new arrow function would create an
    // unremovable duplicate — removeEventListener only matches by reference.
    if (_orientationHandler) return;

    _orientationHandler = (event) => {
      // event.gamma is null if the sensor is unavailable on the device
      if (event.gamma !== null) {
        _rawGamma = event.gamma;
      }
    };

    window.addEventListener('deviceorientation', _orientationHandler);
    console.log('[SensorManager] deviceorientation listener active');
  },

  // ─── startMotion() ──────────────────────────────────────────────────────────
  // Attach a devicemotion listener for shake detection and stillness tracking.
  //
  // ── accelerationIncludingGravity vs acceleration ──────────────────────────
  // DeviceMotionEvent gives two acceleration readings:
  //
  //   event.acceleration — the "pure" linear acceleration of the device with
  //     Earth's gravity mathematically removed. Done via sensor fusion (combining
  //     accelerometer + gyroscope output). A stationary phone reads ≈ {0, 0, 0}.
  //     PROBLEM: sensor fusion is optional. On many real devices this property
  //     is null or NaN. You cannot reliably depend on it.
  //
  //   event.accelerationIncludingGravity — the raw accelerometer output, with no
  //     processing. A stationary phone reads ≈ {x:0, y:−9.8, z:0}. It's negative
  //     on the y-axis because the accelerometer measures the REACTION force —
  //     the ground pushing UP on a stationary object — and iOS treats upward as
  //     negative on this axis. (Equivalently: gravity pulls "down" at −9.8.)
  //     This field is ALWAYS available. It comes directly from hardware.
  //
  // We use accelerationIncludingGravity because it is always non-null.
  // The constant ~9.8 contribution from gravity is predictable: a stationary
  // phone has magnitude ≈ 9.8. So we set SHAKE_THRESHOLD = 20, which is
  // comfortably above the 9.8 resting baseline but below the 25–40 m/s²
  // of a vigorous shake.
  //
  // WHY magnitude, not a single axis:
  // Shaking a phone is a 3D motion — the phone moves along multiple axes at once.
  // Checking only x, y, or z would miss shakes that happen diagonally. The
  // magnitude √(x² + y² + z²) captures the total force regardless of direction.
  //
  // THIS IS THE KEY API FOR THE COCKTAIL SHAKER APP.
  // The shaker app registers onShake(() => confirmMix()) and this listener fires it.
  startMotion() {
    if (_motionHandler) return; // Guard against double-attach (same reason as startOrientation)

    _motionHandler = (event) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x === null) return; // Sensor not available on this device

      const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const now = Date.now();

      // Update last-motion timestamp whenever the phone is noticeably moving.
      // Used by isStill() to know when the device has come to rest.
      if (magnitude > MOTION_THRESHOLD) {
        _lastMotionTimestamp = now;
      }

      // Shake: magnitude above threshold AND cooldown elapsed since last shake
      if (magnitude > SHAKE_THRESHOLD && now - _lastShakeTime > SHAKE_COOLDOWN_MS) {
        _lastShakeTime = now;
        if (_shakeCallback) {
          _shakeCallback(magnitude); // Pass intensity — shaker app can use it to grade mixing
        }
      }
    };

    window.addEventListener('devicemotion', _motionHandler);
    console.log('[SensorManager] devicemotion listener active');
  },

  // ─── calibrate() ─────────────────────────────────────────────────────────────
  // Record the current gamma as the "zero" reference point.
  //
  // Called once at the start of each game round, before the first frame renders.
  // All subsequent getTilt() readings subtract this offset so that "however the
  // player is holding the phone right now" maps to zero tilt.
  //
  // WHY this matters: people hold phones at different natural angles. Without
  // calibration, a player whose habitual hold is 10° right will experience
  // constant 10° of drift to the right even when trying to go straight. One
  // line of code eliminates this permanently.
  //
  // In keyboard fallback mode: _rawGamma is always 0, so offset is 0, no-op.
  //
  // COCKTAIL SHAKER NOTE: calibrate on app open so "phone resting on bar"
  // reads as neutral pour angle regardless of the bar's actual tilt.
  calibrate() {
    _calibrationOffset = _rawGamma;
    _smoothedTilt = 0; // Reset smoothed history so it starts fresh from the new zero
    console.log('[SensorManager] Calibrated — offset:', _calibrationOffset.toFixed(1), '°');
  },

  // ─── getTilt() ────────────────────────────────────────────────────────────────
  // Return a smoothed, calibrated tilt: −1.0 (full left) to +1.0 (full right).
  // Called once per frame (~60fps) by the game engine.
  //
  // ── PROCESSING PIPELINE ───────────────────────────────────────────────────
  //
  // Input source priority:
  //   1. Arrow keys (if held) — desktop testing fallback
  //   2. Device gamma — real sensor path
  //
  // Sensor path steps:
  //
  //   Step 1 — Calibration:
  //     adjusted = rawGamma − calibrationOffset
  //     If calibration captured 10° (player's natural hold), then holding the
  //     phone at 10° gives adjusted = 0. Tilt 10° further right gives adjusted = 10°.
  //
  //   Step 2 — Clamp:
  //     clamped = clamp(adjusted, −45, +45)
  //     Discards anything beyond ±45°. Near the ±90° limits, gamma values become
  //     discontinuous and unreliable. Staying in ±45° keeps the smooth region.
  //
  //   Step 3 — Normalise:
  //     input = clamped / 45     → maps −45°..+45° to −1..+1
  //
  //   Step 4 — EMA smooth:
  //     smoothed = ALPHA × input + (1 − ALPHA) × smoothed
  //
  // ── WHY EMA AND NOT A ROLLING AVERAGE ─────────────────────────────────────
  // A rolling average keeps a window of N past values and averages them.
  // Problem 1 — Memory: O(N) storage, O(N) compute per frame.
  // Problem 2 — Finite impulse response: when a value falls out of the window
  //   it disappears instantly from the average. If you had a momentary spike
  //   10 frames ago, the output jumps when it exits the window. This causes
  //   sudden twitches in the smoothed signal — exactly what we're smoothing to avoid.
  //
  // EMA: O(1) memory (one variable), O(1) compute (two multiplications, one add).
  // It has "infinite impulse response" — past values contribute forever but their
  // influence decays exponentially: a reading N frames ago weighs (1−alpha)^N.
  // With alpha=0.2, 5 frames ago = 0.8^5 = 0.33× weight. 10 frames ago = 0.11×.
  // Old values fade out smoothly — no discontinuities, no twitches.
  //
  // For game feel: EMA gives physical "momentum" to the steering. Releasing the
  // tilt deceleration feels gradual, not an instant snap to zero.
  // The same formula applies in the shaker app for smoothing shake magnitude.
  getTilt() {
    let input;

    if (_keys.ArrowLeft || _keys.ArrowRight) {
      // Keyboard path — 0.6 not 1.0 because full ±1 feels twitchy on a keyboard
      input = _keys.ArrowLeft ? -0.6 : 0.6;
    } else {
      // Sensor path
      const adjusted = _rawGamma - _calibrationOffset;
      const clamped  = Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, adjusted));
      input = clamped / TILT_MAX_DEG;
    }

    // EMA: TILT_ALPHA of new input blended with (1 − TILT_ALPHA) of history
    _smoothedTilt = TILT_ALPHA * input + (1 - TILT_ALPHA) * _smoothedTilt;

    return _smoothedTilt;
  },

  // ─── isStill(ms) ─────────────────────────────────────────────────────────────
  // Returns true if there has been no significant motion for at least `ms` ms.
  //
  // "Significant" = accelerationIncludingGravity magnitude > MOTION_THRESHOLD.
  //
  // COCKTAIL SHAKER USE:
  //   isStill(800) → phone has come to rest after shaking → mix complete.
  //   Pair with onShake() to detect the full "shake then stop" gesture.
  isStill(ms) {
    // Edge case: if the motion listener hasn't started yet, _lastMotionTimestamp
    // is 0. Date.now() − 0 is always > any reasonable ms value, so isStill()
    // returns true before the game starts — correct, the phone is idle.
    return Date.now() - _lastMotionTimestamp > ms;
  },

  // ─── onShake(callback) ───────────────────────────────────────────────────────
  // Register a callback to fire when a shake gesture is detected.
  // callback(magnitude) — receives peak acceleration in m/s² as an argument.
  //
  // COCKTAIL SHAKER USE:
  //   SensorManager.onShake((intensity) => confirmMix(intensity));
  //   The intensity parameter lets the shaker app grade how vigorous the mixing was.
  onShake(callback) {
    _shakeCallback = callback;
  },

  // ─── stop() ───────────────────────────────────────────────────────────────────
  // Remove all sensor listeners and reset state.
  // Call on: game over, page visibility hidden, app going to background.
  //
  // ── WHY STORED REFERENCES ARE REQUIRED ────────────────────────────────────
  // removeEventListener works by reference equality. It finds the listener to
  // remove by scanning the list for an object === to what you pass in.
  //
  // Arrow functions (`e => { ... }`) create a NEW function object every time
  // they are evaluated. If you write:
  //   window.addEventListener('deviceorientation', e => handleIt(e));
  //   window.removeEventListener('deviceorientation', e => handleIt(e));
  //
  // These are two different objects. removeEventListener finds no match and
  // silently does nothing. The listener runs forever, draining battery.
  //
  // Solution: save the function object into a variable when attaching, and pass
  // the same variable to both addEventListener and removeEventListener.
  // That's what _orientationHandler and _motionHandler are for.
  //
  // COCKTAIL SHAKER NOTE: call stop() when the app goes to background
  // (document.addEventListener('visibilitychange', ...) → if hidden → stop()).
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
    _rawGamma     = 0;
    console.log('[SensorManager] All listeners removed');
  },

  // ─── debug() ─────────────────────────────────────────────────────────────────
  // Return a snapshot of sensor state for the debug HUD.
  // Called every frame while PLAYING. Stripped in Session 5.
  debug() {
    const permState = _iosPermissionRequired
      ? (_permissionGranted ? 'GRANTED' : 'DENIED')
      : 'N/A';

    return {
      rawGamma:    _rawGamma.toFixed(1),
      smoothed:    _smoothedTilt.toFixed(2),
      calibOffset: _calibrationOffset.toFixed(1),
      permission:  permState,
    };
  },
};
