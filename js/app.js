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
        const swapInterval = this.timer.swapInterval;

        // Calculate which interval we were in and which we're in now
        const previousInterval = Math.floor(this.previousTime / swapInterval);
        const currentInterval = Math.floor(currentTime / swapInterval);

        // Check if we crossed a boundary (interval changed)
        if (currentInterval !== previousInterval) {
          // Skip the first interval change after start (don't play sound)
          if (this.hasPlayedFirstInterval) {
            this._playIntervalSound();
          } else {
            this.hasPlayedFirstInterval = true;
          }
        }

        this.previousTime = currentTime;
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
        this.previousTime = this.timer.currentTime;
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
        this.previousTime = this.timer.currentTime;
        this.hasPlayedFirstInterval = false;
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
            if (['gameDuration', 'swapInterval', 'countMode'].includes(key)) {
              // Timer configuration changed - update timer
              this.timer.updateConfig(this.settings.getAll());
              this.previousTime = this.timer.currentTime;
              this.hasPlayedFirstInterval = false;
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
        this.previousTime = this.timer.currentTime;
        this.hasPlayedFirstInterval = false;

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
