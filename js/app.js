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

    this.lastSwapInterval = -1;
    this.hasPlayedFirstInterval = false;
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

    console.log('Hockey Timer App initialized');
  }

  _setupTimerCallbacks() {
    // Timer tick - update display and check for warnings
    this.timer.onTick = (currentTime) => {
      this.ui.updateTimerDisplay(currentTime);

      // Update warning state
      const timeUntilSwap = this.timer.getTimeUntilNextSwap();
      this.ui.updateWarning(timeUntilSwap, WARNING_TIME);

      // ONLY play audio when timer is actively running
      if (this.timer.state === TIMER_STATES.RUNNING) {
        const currentInterval = this.timer.getCurrentInterval();

        // Check if interval has changed
        if (currentInterval !== this.lastSwapInterval) {
          // Skip the first interval change after start (don't play sound)
          if (this.hasPlayedFirstInterval) {
            this._playIntervalSound();
          } else {
            this.hasPlayedFirstInterval = true;
          }
          this.lastSwapInterval = currentInterval;
        }
      }
    };

    // Game finished
    this.timer.onFinish = () => {
      console.log('Game finished');
      // Play interval sound at game end
      this._playIntervalSound();
    };

    // State changed
    this.timer.onStateChange = (state) => {
      this.ui.updateState(state);

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

        // Reset flags for new session
        this.hasPlayedFirstInterval = false;
        this.lastSwapInterval = this.timer.getCurrentInterval();
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
        // Reset flags for fresh start
        this.lastSwapInterval = -1;
        this.hasPlayedFirstInterval = false;
      },

      onAdjustTime: (seconds) => {
        const result = this.timer.adjustTime(seconds);

        // If we crossed an interval boundary, update our tracking
        // But do NOT play sound - only play when timer is running naturally
        if (result.crossedInterval) {
          this.lastSwapInterval = result.currentInterval;
        }
      },

      onSetTime: (minutes, seconds, tenths = 0) => {
        const result = this.timer.setTime(minutes, seconds, tenths);

        // If we crossed an interval boundary, update our tracking
        // But do NOT play sound - only play when timer is running naturally
        if (result.crossedInterval) {
          this.lastSwapInterval = result.currentInterval;
        }
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
            if (['gameDuration', 'swapInterval', 'countMode'].includes(key)) {
              // Timer configuration changed - update timer
              this.timer.updateConfig(this.settings.getAll());
              this.lastSwapInterval = -1;
            }
          });

          console.log('Settings updated:', changes);
        }
      },

      onResetSettings: () => {
        this.settings.reset();
        this.ui.populateSettings(this.settings.getAll());

        // Update timer with reset settings
        this.timer.updateConfig(this.settings.getAll());
        this.lastSwapInterval = -1;

        console.log('Settings reset to defaults');
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
    this.settings.onChange = (key, newValue, oldValue) => {
      console.log(`Setting changed: ${key} = ${newValue} (was ${oldValue})`);
    };
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new HockeyTimerApp();
  await app.initialize();

  // Make app globally accessible for debugging
  window.hockeyTimer = app;
});
