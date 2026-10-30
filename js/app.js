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
    this.timer.onTick = (tenths) => {
      this.ui.updateTimerDisplay(tenths);
      this.ui.updateWarning(this.timer.getTimeUntilNextSwap(), WARNING_TIME);
    };

    this.timer.onSwap = () => {
      this._playIntervalSound();
    };

    this.timer.onFinish = () => {
      if (this.settings.get('playFinalSound')) {
        this._playFinalSound();
      }
    };

    this.timer.onStateChange = (state) => {
      this.ui.updateState(state);
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
      },

      onAdjustTime: (seconds) => {
        this.timer.adjustTime(seconds);
      },

      onSetTime: (minutes, seconds, tenths = 0) => {
        this.timer.setTime(minutes, seconds, tenths);
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
              this.timer.updateConfig(this.settings.getAll());
            }
          });
        }
      },

      onResetSettings: () => {
        this.settings.reset();
        this.ui.populateSettings(this.settings.getAll());
        this.ui.applyTheme(this.settings.get('theme'));

        this.timer.updateConfig(this.settings.getAll());
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
