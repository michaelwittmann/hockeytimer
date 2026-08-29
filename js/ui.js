import { TIMER_STATES } from './constants.js';

export class UIManager {
  constructor() {
    // DOM elements
    this.timerDisplay = null;
    this.startBtn = null;
    this.stopBtn = null;
    this.resetBtn = null;
    this.settingsBtn = null;
    this.settingsModal = null;
    this.settingsClose = null;
    this.timeAdjustButtons = {};
    this.editTimeBtn = null;
    this.timeInput = null;
    this.timerContainer = null;

    // State
    this.isEditMode = false;
    this.currentState = TIMER_STATES.STOPPED;
  }

  initialize() {
    // Get DOM references
    this.timerDisplay = document.getElementById('timer-display');
    this.startBtn = document.getElementById('start-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsClose = document.getElementById('settings-close');
    this.timerContainer = document.getElementById('timer-container');

    // Setup keyboard shortcuts
    this._setupKeyboardShortcuts();
  }

  bindEvents(callbacks) {
    this.callbacks = callbacks;

    // Control buttons - Start/Pause toggle
    this.startBtn.addEventListener('click', () => {
      if (this.currentState === TIMER_STATES.RUNNING) {
        callbacks.onPause();
      } else if (this.currentState === TIMER_STATES.PAUSED) {
        callbacks.onResume();
      } else {
        callbacks.onStart();
      }
    });

    this.resetBtn.addEventListener('click', () => callbacks.onReset());

    // Direct time input - only when not running
    this.timerDisplay.addEventListener('click', () => {
      if (this.currentState !== TIMER_STATES.RUNNING) {
        this._enterEditMode();
      }
    });

    // Settings
    this.settingsBtn.addEventListener('click', () => this._openSettings());
    this.settingsClose.addEventListener('click', () => this._closeSettings());

    // Close settings on backdrop click
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this._closeSettings();
      }
    });
  }

  updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    const display = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${tenths}`;

    if (!this.isEditMode) {
      this.timerDisplay.textContent = display;
    }
  }

  updateState(state) {
    this.currentState = state;
    this.timerContainer.className = `timer-container state-${state}`;

    // Update button states
    switch (state) {
      case TIMER_STATES.STOPPED:
        this.startBtn.textContent = 'Start';
        this.startBtn.disabled = false;
        this.startBtn.classList.remove('secondary');
        this.startBtn.classList.add('primary');
        this.resetBtn.disabled = false;
        break;

      case TIMER_STATES.RUNNING:
        this.startBtn.textContent = 'Pause';
        this.startBtn.disabled = false;
        this.startBtn.classList.remove('primary');
        this.startBtn.classList.add('secondary');
        this.resetBtn.disabled = true;
        break;

      case TIMER_STATES.PAUSED:
        this.startBtn.textContent = 'Resume';
        this.startBtn.disabled = false;
        this.startBtn.classList.remove('secondary');
        this.startBtn.classList.add('primary');
        this.resetBtn.disabled = false;
        break;

      case TIMER_STATES.FINISHED:
        this.startBtn.textContent = 'Start';
        this.startBtn.disabled = false;
        this.startBtn.classList.remove('secondary');
        this.startBtn.classList.add('primary');
        this.resetBtn.disabled = false;
        break;
    }
  }

  updateWarning(secondsUntilSwap, warningTime) {
    if (this.currentState !== TIMER_STATES.RUNNING) {
      this.timerContainer.classList.remove('warning', 'urgent');
      return;
    }

    if (secondsUntilSwap <= warningTime && secondsUntilSwap > 3) {
      this.timerContainer.classList.add('warning');
      this.timerContainer.classList.remove('urgent');
    } else if (secondsUntilSwap <= 3) {
      this.timerContainer.classList.add('warning', 'urgent');
    } else {
      this.timerContainer.classList.remove('warning', 'urgent');
    }
  }

  showAudioWarning(message) {
    const warning = document.getElementById('audio-warning');
    if (warning) {
      warning.textContent = message;
      warning.style.display = 'block';
    }
  }

  hideAudioWarning() {
    const warning = document.getElementById('audio-warning');
    if (warning) {
      warning.style.display = 'none';
    }
  }

  _enterEditMode() {
    if (this.isEditMode) return;

    this.isEditMode = true;
    const currentText = this.timerDisplay.textContent;
    const parts = currentText.split(':');
    const minutes = parts[0];
    const seconds = parts[1];
    const tenths = parts[2] || '0';

    // Check if device is mobile/touch-based
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      // Use select pickers for mobile
      this.timerDisplay.innerHTML = `<select id="edit-minutes" class="time-edit-select">${this._generateOptions(0, 99, parseInt(minutes))}</select><span class="time-separator">:</span><select id="edit-seconds" class="time-edit-select">${this._generateOptions(0, 59, parseInt(seconds))}</select><span class="time-separator">:</span><select id="edit-tenths" class="time-edit-select time-edit-select-tenths">${this._generateOptions(0, 9, parseInt(tenths))}</select>`;
    } else {
      // Use number inputs for desktop
      this.timerDisplay.innerHTML = `<input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-minutes" class="time-edit-input" value="${String(parseInt(minutes)).padStart(2, '0')}" min="0" max="99"><span class="time-separator">:</span><input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-seconds" class="time-edit-input" value="${String(parseInt(seconds)).padStart(2, '0')}" min="0" max="59"><span class="time-separator">:</span><input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-tenths" class="time-edit-input time-edit-input-tenths" value="${parseInt(tenths)}" min="0" max="9">`;
    }

    const minutesInput = document.getElementById('edit-minutes');
    const secondsInput = document.getElementById('edit-seconds');
    const tenthsInput = document.getElementById('edit-tenths');

    minutesInput.focus();
    if (!isTouchDevice) {
      minutesInput.select();
    }

    const confirmEdit = () => {
      const mins = Math.max(0, Math.min(99, parseInt(minutesInput.value) || 0));
      const secs = Math.max(0, Math.min(59, parseInt(secondsInput.value) || 0));
      const tenths = Math.max(0, Math.min(9, parseInt(tenthsInput.value) || 0));

      this._exitEditMode();

      if (this.callbacks && this.callbacks.onSetTime) {
        this.callbacks.onSetTime(mins, secs, tenths);
      }
    };

    const cancelEdit = () => {
      this._exitEditMode();
    };

    // Only add keyboard and input handlers for non-mobile
    if (!isTouchDevice) {
      const handleKeydown = (e) => {
        if (e.key === 'Enter') {
          confirmEdit();
        } else if (e.key === 'Escape') {
          cancelEdit();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          adjustFieldUp(e.target);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          adjustFieldDown(e.target);
        }
      };

    const adjustFieldUp = (field) => {
      const id = field.id;
      let value = parseInt(field.value) || 0;

      if (id === 'edit-minutes') {
        value = (value + 1) % 100; // Roll over at 99
        minutesInput.value = String(value).padStart(2, '0');
      } else if (id === 'edit-seconds') {
        value = value + 1;
        if (value > 59) {
          secondsInput.value = '00';
          // Increment minutes
          const mins = (parseInt(minutesInput.value) || 0) + 1;
          minutesInput.value = String(mins % 100).padStart(2, '0');
        } else {
          secondsInput.value = String(value).padStart(2, '0');
        }
      } else if (id === 'edit-tenths') {
        value = value + 1;
        if (value > 9) {
          tenthsInput.value = '0';
          // Increment seconds
          const secs = (parseInt(secondsInput.value) || 0) + 1;
          if (secs > 59) {
            secondsInput.value = '00';
            // Increment minutes
            const mins = (parseInt(minutesInput.value) || 0) + 1;
            minutesInput.value = String(mins % 100).padStart(2, '0');
          } else {
            secondsInput.value = String(secs).padStart(2, '0');
          }
        } else {
          tenthsInput.value = value;
        }
      }
    };

    const adjustFieldDown = (field) => {
      const id = field.id;
      let value = parseInt(field.value) || 0;

      if (id === 'edit-minutes') {
        value = value - 1;
        if (value < 0) value = 99;
        minutesInput.value = String(value).padStart(2, '0');
      } else if (id === 'edit-seconds') {
        value = value - 1;
        if (value < 0) {
          secondsInput.value = '59';
          // Decrement minutes
          const mins = (parseInt(minutesInput.value) || 0) - 1;
          minutesInput.value = String(mins < 0 ? 99 : mins).padStart(2, '0');
        } else {
          secondsInput.value = String(value).padStart(2, '0');
        }
      } else if (id === 'edit-tenths') {
        value = value - 1;
        if (value < 0) {
          tenthsInput.value = '9';
          // Decrement seconds
          const secs = (parseInt(secondsInput.value) || 0) - 1;
          if (secs < 0) {
            secondsInput.value = '59';
            // Decrement minutes
            const mins = (parseInt(minutesInput.value) || 0) - 1;
            minutesInput.value = String(mins < 0 ? 99 : mins).padStart(2, '0');
          } else {
            secondsInput.value = String(secs).padStart(2, '0');
          }
        } else {
          tenthsInput.value = value;
        }
      }
    };

    const handleInput = (e) => {
      const field = e.target;
      const id = field.id;
      let value = field.value;
      let isValid = true;

      // Apply field-specific validation
      if (id === 'edit-minutes') {
        // Check if > 2 digits or > 99
        if (value.length > 2 || parseInt(value) > 99) {
          isValid = false;
        }
      } else if (id === 'edit-seconds') {
        // Check if > 2 digits or > 59
        if (value.length > 2 || parseInt(value) > 59) {
          isValid = false;
        }
      } else if (id === 'edit-tenths') {
        // Check if > 1 digit
        if (value.length > 1) {
          isValid = false;
        }
      }

      // Toggle invalid class
      if (isValid) {
        field.classList.remove('invalid');
      } else {
        field.classList.add('invalid');
      }
    };

    minutesInput.addEventListener('keydown', handleKeydown);
    secondsInput.addEventListener('keydown', handleKeydown);
    tenthsInput.addEventListener('keydown', handleKeydown);

    minutesInput.addEventListener('input', handleInput);
    secondsInput.addEventListener('input', handleInput);
    tenthsInput.addEventListener('input', handleInput);
    }

    const handleBlur = () => {
      setTimeout(() => {
        if (!minutesInput.matches(':focus') &&
            !secondsInput.matches(':focus') &&
            !tenthsInput.matches(':focus')) {
          confirmEdit();
        }
      }, 100);
    };

    minutesInput.addEventListener('blur', handleBlur);
    secondsInput.addEventListener('blur', handleBlur);
    tenthsInput.addEventListener('blur', handleBlur);
  }

  _exitEditMode() {
    this.isEditMode = false;
    // Display will be updated by the next timer tick
  }

  _generateOptions(min, max, selected) {
    let options = '';
    for (let i = min; i <= max; i++) {
      const value = i < 10 && max > 9 ? String(i).padStart(2, '0') : String(i);
      const isSelected = i === selected ? ' selected' : '';
      options += `<option value="${i}"${isSelected}>${value}</option>`;
    }
    return options;
  }

  _openSettings() {
    this.settingsModal.classList.add('active');

    if (this.callbacks && this.callbacks.onOpenSettings) {
      this.callbacks.onOpenSettings();
    }
  }

  _closeSettings() {
    this.settingsModal.classList.remove('active');

    if (this.callbacks && this.callbacks.onCloseSettings) {
      this.callbacks.onCloseSettings();
    }
  }

  populateSettings(settings) {
    document.getElementById('setting-game-duration').value = settings.gameDuration;
    document.getElementById('setting-swap-interval').value = settings.swapInterval;
    document.getElementById('setting-count-mode').value = settings.countMode;
    document.getElementById('setting-interval-sound').value = settings.intervalSound;
  }

  getSettingsFromForm() {
    return {
      gameDuration: parseInt(document.getElementById('setting-game-duration').value),
      swapInterval: parseInt(document.getElementById('setting-swap-interval').value),
      countMode: document.getElementById('setting-count-mode').value,
      intervalSound: document.getElementById('setting-interval-sound').value
    };
  }

  bindSettingsEvents(callbacks) {
    // Auto-save on any change
    const autoSave = () => {
      if (callbacks.onSaveSettings) {
        callbacks.onSaveSettings(this.getSettingsFromForm());
      }
    };

    // Listen to all setting inputs
    document.getElementById('setting-game-duration').addEventListener('change', autoSave);
    document.getElementById('setting-swap-interval').addEventListener('change', autoSave);
    document.getElementById('setting-count-mode').addEventListener('change', autoSave);
    document.getElementById('setting-interval-sound').addEventListener('change', autoSave);

    // Reset settings
    document.getElementById('reset-settings').addEventListener('click', () => {
      if (callbacks.onResetSettings) {
        callbacks.onResetSettings();
      }
    });

    // Test current selected sound
    document.getElementById('test-current-sound').addEventListener('click', () => {
      const soundKey = document.getElementById('setting-interval-sound').value;
      if (callbacks.onTestSound) {
        callbacks.onTestSound(soundKey);
      }
    });
  }

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when editing time
      if (this.isEditMode) return;

      // Don't trigger when modal is open
      if (this.settingsModal.classList.contains('active')) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (this.currentState === TIMER_STATES.RUNNING) {
            this.callbacks.onPause();
          } else if (this.currentState === TIMER_STATES.PAUSED) {
            this.callbacks.onResume();
          } else {
            this.callbacks.onStart();
          }
          break;

        case 'Enter':
          // Prevent Enter from triggering button clicks
          e.preventDefault();
          break;

        case 'r':
        case 'R':
          e.preventDefault();
          this.callbacks.onReset();
          break;

        case 'ArrowUp':
          e.preventDefault();
          this.callbacks.onAdjustTime(1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          this.callbacks.onAdjustTime(-1);
          break;

        case 'e':
        case 'E':
          e.preventDefault();
          this._enterEditMode();
          break;

        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this._openSettings();
          }
          break;
      }
    });
  }
}
