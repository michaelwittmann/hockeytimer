import { GameTimer } from './timer.js';
import { AudioManager } from './audio.js';
import { SettingsManager } from './settings.js';
import { UIManager } from './ui.js';
import { TIMER_STATES, WARNING_TIME, VOLUME } from './constants.js';

class HockeyTimerApp {
  constructor() {
    this.timer = null;
    this.audio = null;
    this.settings = null;
    this.ui = null;

    this.previousTime = 0;
  }

  async initialize() {
    // Initialize managers
    this.settings = new SettingsManager();
    this.audio = new AudioManager();
    this.ui = new UIManager();

    // Load settings
    const savedSettings = this.settings.load();

    // Initialize UI
    this.ui.initialize();
    this.ui.populateSettings(savedSettings);

    // Create timer with loaded settings
    this.timer = new GameTimer(savedSettings);

    // Set up callbacks
    this._setupTimerCallbacks();
    this._setupUICallbacks();
    this._setupSettingsCallbacks();

    // Initialize audio (but don't start context yet - needs user gesture)
    await this.audio.initialize();
    this.audio.setVolume(VOLUME);

    // Update UI to initial state
    this.ui.updateTimerDisplay(this.timer.currentTime);
    this.ui.updateState(this.timer.state);
    this.ui.applyTheme(savedSettings.theme || 'modern');
  }

  _setupTimerCallbacks() {
    // Timer tick - update display and check for warnings
    this.timer.onTick = (currentTime) => {
      this.ui.updateTimerDisplay(currentTime);

      // Update warning state
      const timeUntilSwap = this.timer.getTimeUntilNextSwap();
      this.ui.updateWarning(timeUntilSwap, WARNING_TIME);

      // ONLY play audio when timer is actively running and not finished
      if (this.timer.state === TIMER_STATES.RUNNING && !this.timer.isFinished()) {
        const swapInterval = this.timer.swapInterval;
        const countMode = this.timer.countMode;

        let crossed;
        if (countMode === 'countDown') {
          const prevFloor = Math.floor(this.previousTime);
          const curFloor  = Math.floor(currentTime);
          // curFloor > 0 excludes the game-end zero boundary (handled by onFinish)
          crossed = prevFloor !== curFloor
            && curFloor % swapInterval === 0
            && curFloor > 0;
        } else {
          const previousInterval = Math.floor(Math.floor(this.previousTime) / swapInterval);
          const currentInterval  = Math.floor(Math.floor(currentTime) / swapInterval);
          // currentInterval > 0 excludes the starting position
          crossed = currentInterval > previousInterval && currentInterval > 0;
        }

        if (crossed) {
          this._playIntervalSound();
        }
      }

      // Always update previousTime (even when not running, for display updates)
      this.previousTime = currentTime;
    };

    // Game finished
    this.timer.onFinish = () => {
      if (this.settings.get('playFinalSound')) {
        this._playFinalSound();
      }
    };

    // State changed
    this.timer.onStateChange = (state) => {
      this.ui.updateState(state);

      // Snap previousTime whenever we start running so any time adjustments
      // made while stopped/paused don't look like interval crossings.
      if (state === TIMER_STATES.RUNNING) {
        this.previousTime = this.timer.currentTime;
      }

      // Remove warnings when not running
      if (state !== TIMER_STATES.RUNNING) {
        this.ui.updateWarning(0, 0);
      }
    };
  }

  _setupUICallbacks() {
    this.ui.bindEvents({
      onStart: async () => {
        // Resume audio context on first user interaction
        if (!this.audio.isReady()) {
          await this.audio.resume();
          if (this.audio.isReady()) {
            this.ui.hideAudioWarning();
          }
        }
        this.timer.start();
      },

      onResume: () => {
        this.timer.resume();
      },

      onPause: () => {
        this.timer.pause();
      },

      onStop: () => {
        this.timer.stop();
      },

      onReset: () => {
        this.timer.reset();
        this.previousTime = this.timer.currentTime;
      },

      onAdjustTime: (seconds) => {
        this.timer.adjustTime(seconds);
        // Update previousTime to current after manual adjustment
        this.previousTime = this.timer.currentTime;
      },

      onSetTime: (minutes, seconds, tenths = 0) => {
        this.timer.setTime(minutes, seconds, tenths);
        // Update previousTime to current after manual adjustment
        this.previousTime = this.timer.currentTime;
      },

      onOpenSettings: () => {
        this.ui.populateSettings(this.settings.getAll());
      },

      onCloseSettings: () => {
        // Settings closed without saving
      }
    });

    this.ui.bindSettingsEvents({
      onSaveSettings: (newSettings) => {
        const changes = this.settings.update(newSettings);

        if (changes.length > 0) {
          // Apply settings that need immediate effect
          changes.forEach(({ key, newValue }) => {
            if (key === 'theme') {
              this.ui.applyTheme(newValue);
            }
            if (['gameDuration', 'swapInterval', 'countMode'].includes(key)) {
              // Timer configuration changed - update timer
              this.timer.updateConfig(this.settings.getAll());
              this.previousTime = this.timer.currentTime;
            }
          });
        }
      },

      onResetSettings: () => {
        this.settings.reset();
        this.ui.populateSettings(this.settings.getAll());
        this.ui.applyTheme(this.settings.get('theme'));

        // Update timer with reset settings
        this.timer.updateConfig(this.settings.getAll());
        this.previousTime = this.timer.currentTime;
      },

      onTestSound: (soundKey) => {
        if (!this.audio.isReady()) {
          this.audio.resume().then(() => {
            if (this.audio.isReady()) {
              this.ui.hideAudioWarning();
              this.audio.playSound(soundKey);
            }
          });
        } else {
          this.audio.playSound(soundKey);
        }
      }
    });
  }

  _setupSettingsCallbacks() {
    // Settings change handler removed - no longer needed
  }

  _playIntervalSound() {
    const soundKey = this.settings.get('intervalSound');

    if (!this.audio.isReady()) {
      console.warn('Audio not ready - cannot play interval sound');
      this.ui.showAudioWarning('Audio not enabled - click Start to enable');
      return;
    }

    this.audio.playSound(soundKey);
  }

  _playFinalSound() {
    const soundKey = this.settings.get('finalSound');

    if (!this.audio.isReady()) {
      console.warn('Audio not ready - cannot play final sound');
      return;
    }

    this.audio.playSound(soundKey);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new HockeyTimerApp();
  await app.initialize();

  // Make app globally accessible for debugging
  window.hockeyTimer = app;
});
