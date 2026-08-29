import { SOUND_FILES, SCHEDULE_AHEAD_TIME } from './constants.js';

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.scheduledSounds = [];
    this.isInitialized = false;
    this.volume = 0.8;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Load all sound files
      await this._loadSounds();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  async resume() {
    if (!this.audioContext) return false;

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        return true;
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return false;
      }
    }

    return true;
  }

  async _loadSounds() {
    const loadPromises = Object.entries(SOUND_FILES).map(async ([key, path]) => {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds.set(key, audioBuffer);
      } catch (error) {
        console.error(`Failed to load sound ${key}:`, error);
        // Create a simple beep as fallback
        this.sounds.set(key, this._createBeepBuffer());
      }
    });

    await Promise.all(loadPromises);
  }

  _createBeepBuffer() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3; // 300ms beep
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const channel = buffer.getChannelData(0);

    // Generate a simple sine wave beep at 800Hz
    const frequency = 800;
    for (let i = 0; i < buffer.length; i++) {
      channel[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
    }

    return buffer;
  }

  playSound(soundKey, delay = 0) {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('Audio not initialized');
      return null;
    }

    const buffer = this.sounds.get(soundKey);
    if (!buffer) {
      console.warn(`Sound ${soundKey} not found`);
      return null;
    }

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = this.volume;

    // Connect: source -> gain -> destination
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Schedule or play immediately
    const playTime = this.audioContext.currentTime + delay;
    source.start(playTime);

    return source;
  }

  scheduleIntervalSound(soundKey, gameTime, swapInterval) {
    // Calculate next swap time
    const timeInCycle = gameTime % swapInterval;
    const timeUntilNextSwap = swapInterval - timeInCycle;

    // Only schedule if within lookahead window
    if (timeUntilNextSwap <= SCHEDULE_AHEAD_TIME) {
      this.playSound(soundKey, timeUntilNextSwap);
    }
  }

  playEndGameSound() {
    this.playSound('endgame');
  }

  cancelAllScheduled() {
    // Cancel any scheduled sounds if we were tracking them
    this.scheduledSounds.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped or never started
      }
    });
    this.scheduledSounds = [];
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
  }

  getVolume() {
    return this.volume;
  }

  isReady() {
    return this.isInitialized && this.audioContext && this.audioContext.state === 'running';
  }

  getState() {
    if (!this.audioContext) return 'not-initialized';
    return this.audioContext.state;
  }
}
