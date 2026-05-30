// platforms.js — Procedural platform generation, collision detection, and world scrolling.
//
// SCROLLING STRATEGY (scroll-the-world):
// Rather than tracking a camera position, we keep the player in screen coordinates
// and shift all platform positions DOWN whenever the player climbs above a threshold.
// The player looks like they're climbing; actually the world moves under them.
// This is simpler to reason about than a camera transform, especially when
// platforms need to be culled and generated relative to the visible window.

const PLATFORM_WIDTH  = 70;
const PLATFORM_HEIGHT = 14;

// Vertical gap between consecutive platforms (pixels).
// Randomised between min and max to avoid a ladder feel.
const GAP_MIN = 55;
const GAP_MAX = 85;

// The player triggers world-scroll when they rise above this fraction of screen height.
// 0.70 means the top 30% of the screen is the "scroll zone" — feels like
// the player has real upward momentum before the camera locks on.
const SCROLL_THRESHOLD_RATIO = 0.70;

export class PlatformManager {
  constructor(canvas) {
    this.canvas        = canvas;
    this.platforms     = [];
    this.totalScrolled = 0; // Total pixels shifted — used to compute score
    this._generateInitial();
  }

  // Reset everything — called at the start of each new game
  reset(canvas) {
    this.canvas        = canvas;
    this.platforms     = [];
    this.totalScrolled = 0;
    this._generateInitial();
  }

  // Populate the screen with starting platforms bottom-to-top
  _generateInitial() {
    const { canvas } = this;

    // Anchor platform directly below where the player spawns — guaranteed first landing
    let y = canvas.height - 60;
    this.platforms.push({
      x:      canvas.width / 2 - PLATFORM_WIDTH / 2,
      y,
      width:  PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type:   'static',
      tier:   'common', // Starting platform is always common
    });

    // Fill the rest of the screen with random platforms
    while (y > 0) {
      y -= GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
      this.platforms.push(this._createAt(y));
    }
  }

  // Create one platform at the given y, random x within canvas bounds.
  // Tier is cosmetic only — common 70%, uncommon 20%, rare 10%.
  // WHY data not presentation: the renderer reads tier and picks colours.
  // Nothing else in the codebase needs to know a platform's tier.
  _createAt(y) {
    const roll = Math.random();
    const tier = roll < 0.10 ? 'rare'
               : roll < 0.30 ? 'uncommon'
               : 'common';

    return {
      x:      Math.random() * (this.canvas.width - PLATFORM_WIDTH),
      y,
      width:  PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type:   'static',
      tier,
    };
  }

  // Called every frame — order matters: collide → scroll → generate → cull
  update(player, scoreManager) {
    this._checkCollision(player);
    this._scroll(player);
    this._generate();
    this._cull();

    // Score = total distance climbed, scaled to a human-readable number
    scoreManager.setScore(Math.floor(this.totalScrolled / 8));
  }

  // Detect and resolve player landing on a platform.
  // WHY check vy > 0 first: we only want to collide when the player is FALLING.
  // Without this check, a player rising through a platform from below would
  // get stuck — the "ceiling collision" would fire and snap them to the top.
  _checkCollision(player) {
    if (player.vy <= 0) return; // Player is rising — skip all collision checks

    for (const p of this.platforms) {
      // Swept collision: was the player's bottom above the platform top last frame,
      // and is it at or below the platform top this frame?
      // player.bottom - player.vy reconstructs the bottom position one frame ago.
      // This handles high-velocity situations where the player could skip through
      // a thin platform in a single frame (the "tunnelling" problem).
      const prevBottom = player.bottom - player.vy;
      const wasAbove   = prevBottom <= p.y;
      const isBelow    = player.bottom >= p.y;

      const horizontalOverlap =
        player.right  > p.x + 2 &&      // +2/-2 gives a small forgiveness margin
        player.left   < p.x + p.width - 2;

      if (wasAbove && isBelow && horizontalOverlap) {
        player.bounce();
        player.y = p.y - player.height; // Snap player to sit on top of platform
        break; // Only land on one platform per frame
      }
    }
  }

  // Shift the world down when the player climbs above the scroll threshold.
  // This creates the visual effect of scrolling upward.
  _scroll(player) {
    const threshold = this.canvas.height * SCROLL_THRESHOLD_RATIO;

    if (player.y < threshold) {
      const shift = threshold - player.y; // How far above the threshold the player is

      // Move all platforms down by the same amount
      this.platforms.forEach(p => { p.y += shift; });

      // Freeze the player at the threshold — visually they appear to be still moving
      // because the world shifts beneath them
      player.y = threshold;

      // Accumulate total scroll distance for score tracking
      this.totalScrolled += shift;
    }
  }

  // Generate new platforms above the current highest platform.
  // Keeps a buffer of ~one screen height above the visible area so the player
  // never reaches the top of the platform pool mid-jump.
  _generate() {
    if (this.platforms.length === 0) return;

    let highestY = Math.min(...this.platforms.map(p => p.y));

    // Generate until we have platforms well above the visible area
    while (highestY > -this.canvas.height) {
      highestY -= GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
      this.platforms.push(this._createAt(highestY));
    }
  }

  // Remove platforms that have scrolled below the bottom of the screen.
  // Without this, the platform array grows indefinitely and slows the game.
  _cull() {
    this.platforms = this.platforms.filter(
      p => p.y < this.canvas.height + PLATFORM_HEIGHT + 10
    );
  }

  // Return the full platform array — used by the renderer
  getAll() {
    return this.platforms;
  }
}
