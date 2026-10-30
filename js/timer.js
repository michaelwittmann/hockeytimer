import { TIMER_STATES } from './constants.js';

// Internal time unit: tenths of a second (integers only).
// Count-down starts at gameDuration*600 + 9  (e.g. 32:00:9 = 19209)
// Count-up   starts at 0                     (00:00:0)

function toTenths(minutes, seconds = 0, tenths = 0) {
  return minutes * 600 + seconds * 10 + tenths;
}

function startTenths(gameDurationMinutes, countMode) {
  return countMode === 'countDown'
    ? toTenths(gameDurationMinutes) + 9  // 32:00:9
    : 0;                                  // 00:00:0
}

export class GameTimer {
  constructor(config) {
    this.gameDuration  = config.gameDuration;   // minutes
    this.swapInterval  = config.swapInterval;   // seconds
    this.countMode     = config.countMode;

    this.state       = TIMER_STATES.STOPPED;
    this.currentTime = startTenths(this.gameDuration, this.countMode); // tenths

    // High-precision timing
    this.startTimestamp = null;
    this.pausedTime     = this.currentTime;
    this.lastTickTime   = null;
    this.animationFrameId = null;
    this._wasFinished   = false;

    // Callbacks
    this.onTick        = null; // (tenths) => void
    this.onSwap        = null; // () => void
    this.onFinish      = null; // () => void
    this.onStateChange = null; // (state) => void
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start() {
    if (this.state === TIMER_STATES.RUNNING) return;
    if (this.state === TIMER_STATES.FINISHED) this._reset();

    this.state          = TIMER_STATES.RUNNING;
    this.startTimestamp = performance.now();
    this.lastTickTime   = this.startTimestamp;

    this.onStateChange?.(this.state);
    this._tick();
  }

  pause() {
    if (this.state !== TIMER_STATES.RUNNING) return;

    this.state      = TIMER_STATES.PAUSED;
    this.pausedTime = this.currentTime;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.onStateChange?.(this.state);
  }

  resume() {
    if (this.state !== TIMER_STATES.PAUSED) return;

    this.state          = TIMER_STATES.RUNNING;
    this.currentTime    = this.pausedTime;
    this.startTimestamp = performance.now();
    this.lastTickTime   = this.startTimestamp;

    this.onStateChange?.(this.state);
    this._tick();
  }

  stop() {
    this.state = TIMER_STATES.STOPPED;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.onStateChange?.(this.state);
  }

  reset() {
    this.stop();
    this._reset();
  }

  // Adjust by whole seconds (positive or negative).
  adjustTime(seconds) {
    const maxTenths = (this.countMode === 'countUp' && this.state === TIMER_STATES.RUNNING)
      ? this._finishTenths()
      : toTenths(99, 59, 9);
    this.currentTime = Math.max(0, Math.min(maxTenths, this.currentTime + seconds * 10));

    if (this.state === TIMER_STATES.RUNNING) {
      this.startTimestamp = performance.now();
      this.lastTickTime   = this.startTimestamp;
    } else if (this.state === TIMER_STATES.PAUSED) {
      this.pausedTime = this.currentTime;
    }

    this.onTick?.(this.currentTime);
  }

  setTime(minutes, seconds, tenths = 0) {
    const target = toTenths(minutes, seconds, tenths);
    this.adjustTime((target - this.currentTime) / 10);
  }

  // Returns seconds until next swap boundary (for warning highlight).
  getTimeUntilNextSwap() {
    const wholeSeconds = Math.floor(this.currentTime / 10);
    const swapSec      = this.swapInterval;

    if (this.countMode === 'countDown') {
      return wholeSeconds % swapSec;
    } else {
      const rem = wholeSeconds % swapSec;
      return rem === 0 ? swapSec : swapSec - rem;
    }
  }

  updateConfig(config) {
    const wasRunning = this.state === TIMER_STATES.RUNNING;
    if (wasRunning) this.pause();

    this.gameDuration = config.gameDuration;
    this.swapInterval = config.swapInterval;
    this.countMode    = config.countMode;

    this.currentTime  = startTenths(this.gameDuration, this.countMode);
    this.pausedTime   = this.currentTime;
    this._wasFinished = false;

    this.onTick?.(this.currentTime);

    if (wasRunning) this.resume();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _finishTenths() {
    // Count-down finishes at 00:00:0; count-up finishes at gameDuration:00:0
    return this.countMode === 'countDown' ? 0 : toTenths(this.gameDuration);
  }

  _isFinished() {
    return this.countMode === 'countDown'
      ? this.currentTime <= 0
      : this.currentTime >= toTenths(this.gameDuration);
  }

  _reset() {
    this.currentTime  = startTenths(this.gameDuration, this.countMode);
    this.pausedTime   = this.currentTime;
    this.startTimestamp = null;
    this.lastTickTime   = null;
    this._wasFinished   = false;
    this.onTick?.(this.currentTime);
  }

  _tick() {
    if (this.state !== TIMER_STATES.RUNNING) return;

    const now     = performance.now();
    const elapsed = now - this.lastTickTime; // milliseconds
    this.lastTickTime = now;

    const prevTenths = this.currentTime;
    const deltaTenths = elapsed / 100; // ms → tenths

    if (this.countMode === 'countDown') {
      this.currentTime = Math.max(0, this.currentTime - deltaTenths);
    } else {
      this.currentTime = Math.min(toTenths(this.gameDuration), this.currentTime + deltaTenths);
    }

    // Interval crossing: compare whole-second buckets.
    // Count-down: fire when the displayed second just became a multiple of swapInterval
    //   (and it's not zero, which is handled by onFinish).
    // Count-up:   fire when we cross into a new swapInterval bucket (skip bucket 0).
    const prevSec = Math.floor(prevTenths / 10);
    const curSec  = Math.floor(this.currentTime / 10);

    if (prevSec !== curSec && !this._isFinished()) {
      if (this.countMode === 'countDown') {
        if (curSec % this.swapInterval === 0 && curSec > 0) {
          this.onSwap?.();
        }
      } else {
        const prevBucket = Math.floor(prevSec / this.swapInterval);
        const curBucket  = Math.floor(curSec  / this.swapInterval);
        if (curBucket > prevBucket && curBucket > 0) {
          this.onSwap?.();
        }
      }
    }

    this.onTick?.(this.currentTime);

    if (this._isFinished() && !this._wasFinished) {
      this._wasFinished = true;
      this.state = TIMER_STATES.FINISHED;
      this.onFinish?.();
      this.onStateChange?.(this.state);

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => this._tick());
  }
}
