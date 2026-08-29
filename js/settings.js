import { DEFAULT_SETTINGS } from './constants.js';

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.storageKey = 'hockeyTimerSettings';
    this.onChange = null;
  }

  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Migration: detect old format where swapInterval was in minutes
        // If swapInterval > 300 (5 minutes in seconds), it's likely the old format
        if (parsed.swapInterval && parsed.swapInterval > 300) {
          console.log('Migrating old swapInterval format from minutes to seconds');
          // Don't convert, just use the default (60 seconds)
          parsed.swapInterval = DEFAULT_SETTINGS.swapInterval;
        }

        this.settings = { ...DEFAULT_SETTINGS, ...parsed };

        // Save migrated settings
        this.save();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.settings;
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    const oldValue = this.settings[key];
    this.settings[key] = value;

    this.save();

    if (this.onChange && oldValue !== value) {
      this.onChange(key, value, oldValue);
    }
  }

  update(newSettings) {
    const changed = [];

    Object.entries(newSettings).forEach(([key, value]) => {
      if (this.settings[key] !== value) {
        changed.push({ key, oldValue: this.settings[key], newValue: value });
        this.settings[key] = value;
      }
    });

    if (changed.length > 0) {
      this.save();

      if (this.onChange) {
        changed.forEach(({ key, newValue, oldValue }) => {
          this.onChange(key, newValue, oldValue);
        });
      }
    }

    return changed;
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();

    if (this.onChange) {
      Object.entries(this.settings).forEach(([key, value]) => {
        this.onChange(key, value, null);
      });
    }
  }

  getAll() {
    return { ...this.settings };
  }

  export() {
    return JSON.stringify(this.settings, null, 2);
  }

  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.update(imported);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
}
