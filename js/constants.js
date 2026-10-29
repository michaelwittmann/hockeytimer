// Default configuration constants
export const DEFAULT_SETTINGS = {
  gameDuration: 32,         // minutes
  swapInterval: 60,         // seconds
  countMode: 'countDown',   // 'countDown' or 'countUp'
  intervalSound: 'ship_horn',  // 'buzzer', 'air_horn', 'braam', 'double_bell', 'triple_bell', 'ship_horn'
  playFinalSound: true,        // whether to play a sound when the game ends
  finalSound: 'braam',         // sound to play at game end
  theme: 'modern'              // 'modern' or 'stadium'
};

// Visual warning time (fixed at 10 seconds)
export const WARNING_TIME = 10;

// Volume (fixed at 100%)
export const VOLUME = 1.0;

// Timer states
export const TIMER_STATES = {
  STOPPED: 'stopped',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished'
};

// Sound file paths
export const SOUND_FILES = {
  buzzer: 'sounds/buzzer.mp3',
  air_horn: 'sounds/air_horn.mp3',
  braam: 'sounds/braam.mp3',
  double_bell: 'sounds/double_bell.mp3',
  triple_bell: 'sounds/triple_bell.mp3',
  ship_horn: 'sounds/ship_horn.ogg'
};

// UI constants
export const MIN_TOUCH_TARGET = 44; // pixels
export const SCHEDULE_AHEAD_TIME = 0.1; // seconds
