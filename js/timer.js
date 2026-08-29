import { TIMER_STATES } from './constants.js';

export class GameTimer {
  constructor(config) {
    this.gameDuration = config.gameDuration * 60; // convert to seconds
    this.swapInterval = config.swapInterval * 60; // convert to seconds
    this.countMode = config.countMode;

    // Timer state
    this.state = TIMER_STATES.STOPPED;
    this.currentTime = this.countMode === 'countDown' ? this.gameDuration : 0;

    // High-precision timing
    this.startTimestamp = null;
    this.pausedTime = 0;
    this.lastTickTime = null;
    this.animationFrameId = null;

    // Callbacks
    this.onTick = null;
    this.onSwap = null;
    this.onFinish = null;
    this.onStateChange = null;
  }

  start() {
    if (this.state === TIMER_STATES.RUNNING) return;

    const wasFinished = this.state === TIMER_STATES.FINISHED;

    if (wasFinished) {
      this.reset();
    }

    this.state = TIMER_STATES.RUNNING;
    this.startTimestamp = performance.now();
    this.lastTickTime = this.startTimestamp;

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    this._tick();
  }

  pause() {
    if (this.state !== TIMER_STATES.RUNNING) return;

    this.state = TIMER_STATES.PAUSED;
    this.pausedTime = this.currentTime;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  resume() {
    if (this.state !== TIMER_STATES.PAUSED) return;

    this.state = TIMER_STATES.RUNNING;
    this.currentTime = this.pausedTime;
    this.startTimestamp = performance.now();
    this.lastTickTime = this.startTimestamp;

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    this._tick();
  }

  stop() {
    this.state = TIMER_STATES.STOPPED;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  reset() {
    this.stop();
    this.currentTime = this.countMode === 'countDown' ? this.gameDuration : 0;
    this.startTimestamp = null;
    this.pausedTime = 0;
    this.lastTickTime = null;

    if (this.onTick) {
      this.onTick(this.currentTime);
    }
  }

  adjustTime(seconds) {
    const previousTime = this.currentTime;
    const previousInterval = Math.floor(previousTime / this.swapInterval);

    this.currentTime = Math.max(0, Math.min(this.gameDuration, this.currentTime + seconds));

    const currentInterval = Math.floor(this.currentTime / this.swapInterval);

    // Check if adjustment crossed an interval boundary
    const crossedInterval = previousInterval !== currentInterval;

    if (this.state === TIMER_STATES.RUNNING) {
      // Reset timing reference to avoid drift
      this.startTimestamp = performance.now();
      this.lastTickTime = this.startTimestamp;
    } else if (this.state === TIMER_STATES.PAUSED) {
      this.pausedTime = this.currentTime;
    }

    if (this.onTick) {
      this.onTick(this.currentTime);
    }

    return { crossedInterval, currentInterval };
  }

  setTime(minutes, seconds, tenths = 0) {
    const totalSeconds = minutes * 60 + seconds + (tenths / 10);
    const adjustment = totalSeconds - this.currentTime;
    return this.adjustTime(adjustment);
  }

  getTimeRemaining() {
    if (this.countMode === 'countDown') {
      return this.currentTime;
    } else {
      return Math.max(0, this.gameDuration - this.currentTime);
    }
  }

  getTimeUntilNextSwap() {
    const timeInCycle = this.currentTime % this.swapInterval;

    if (this.countMode === 'countDown') {
      // Count down: time until we hit the next lower interval boundary
      // e.g., at 1:45 in cycle, we have 45 seconds until 1:00
      return timeInCycle;
    } else {
      // Count up: time until we hit the next higher interval boundary
      // e.g., at 0:15 in cycle, we have 45 seconds until 1:00
      return this.swapInterval - timeInCycle;
    }
  }

  getCurrentInterval() {
    return Math.floor(this.currentTime / this.swapInterval);
  }

  isFinished() {
    if (this.countMode === 'countDown') {
      return this.currentTime <= 0;
    } else {
      return this.currentTime >= this.gameDuration;
    }
  }

  _tick() {
    if (this.state !== TIMER_STATES.RUNNING) return;

    const now = performance.now();
    const elapsed = (now - this.lastTickTime) / 1000; // convert to seconds
    this.lastTickTime = now;

    const previousTime = this.currentTime;
    const previousInterval = Math.floor(previousTime / this.swapInterval);

    // Update current time
    if (this.countMode === 'countDown') {
      this.currentTime = Math.max(0, this.currentTime - elapsed);
    } else {
      this.currentTime = Math.min(this.gameDuration, this.currentTime + elapsed);
    }

    const currentInterval = Math.floor(this.currentTime / this.swapInterval);

    // Check if we crossed an interval boundary
    // In count-down mode: play when we cross from higher interval to lower (e.g. 61s -> 59s, play at 60)
    // In count-up mode: play when we cross from lower interval to higher (e.g. 59s -> 61s, play at 60)
    let crossedInterval = false;

    if (this.countMode === 'countDown') {
      // Count down: play when crossing DOWN through an interval boundary (at exactly X:00)
      crossedInterval = previousInterval > currentInterval && currentInterval >= 0;
    } else {
      // Count up: play when crossing UP through an interval boundary (at exactly X:00)
      crossedInterval = currentInterval > previousInterval;
    }

    if (crossedInterval && !this.isFinished()) {
      if (this.onSwap) {
        this.onSwap(currentInterval);
      }
    }

    // Check if game is finished
    if (this.isFinished() && !this._wasFinished) {
      this._wasFinished = true;
      this.state = TIMER_STATES.FINISHED;

      if (this.onFinish) {
        this.onFinish();
      }

      if (this.onStateChange) {
        this.onStateChange(this.state);
      }

      // Stop the animation loop
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      return;
    }

    // Call tick callback
    if (this.onTick) {
      this.onTick(this.currentTime);
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this._tick());
  }

  updateConfig(config) {
    const wasRunning = this.state === TIMER_STATES.RUNNING;

    if (wasRunning) {
      this.pause();
    }

    this.gameDuration = config.gameDuration * 60;
    this.swapInterval = config.swapInterval * 60;
    this.countMode = config.countMode;

    // Reset to new duration
    this.currentTime = this.countMode === 'countDown' ? this.gameDuration : 0;
    this.pausedTime = this.currentTime;

    if (this.onTick) {
      this.onTick(this.currentTime);
    }

    if (wasRunning) {
      this.resume();
    }
  }
}
