// score.js — Score tracking and localStorage persistence.

const HIGH_SCORE_KEY = 'tiltjump_highscore';

export class ScoreManager {
  constructor() {
    this.current = 0;
    this.high    = this._loadHigh();
  }

  // Reset current score to zero — called at the start of each new game.
  // Does NOT reset high score — that persists across sessions.
  reset() {
    this.current = 0;
  }

  // Update the current score. Called every frame from PlatformManager.
  // Also promotes to high score if current is greater.
  setScore(value) {
    this.current = value;
    if (value > this.high) {
      this.high = value;
    }
  }

  // Persist the high score to localStorage at game over.
  // WHY at game over and not every frame: localStorage writes are synchronous I/O.
  // Writing every frame at 60fps would add measurable overhead for no benefit —
  // the score only needs to survive page reload.
  save() {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(this.high));
    } catch (e) {
      // localStorage can throw in private browsing mode on some browsers — fail silently
      console.warn('[Score] Could not save high score:', e);
    }
  }

  // Load persisted high score — returns 0 if none exists yet
  _loadHigh() {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      return 0;
    }
  }
}
