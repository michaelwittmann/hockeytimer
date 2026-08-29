# 🏒 Hockey Timer

A progressive web app for managing youth hockey game timing with automatic player swap intervals.

## Features

- **Flexible Timer Modes**: Count down or count up
- **Audio Signals**: Multiple sound options for swap intervals (buzzer, air horn, ship horn, bells, braam)
- **Visual Warnings**: Color-coded alerts 10 seconds before each swap
- **Manual Time Adjustment**: Click timer to edit or use arrow keys
- **PWA Support**: Install on any device, works offline
- **Mobile-First Design**: Optimized for phones and tablets

## Installation

### GitHub Pages Deployment

This repository is configured to deploy via GitHub Pages:

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Set Source to "Deploy from a branch"
4. Select `main` branch and `/ (root)` folder
5. Save and wait for deployment
6. Access at `https://yourusername.github.io/repository-name/`

### Local Development

1. Clone the repository
2. Start a local web server:
   ```bash
   python3 -m http.server 8000
   # or
   npx serve
   ```
3. Open `http://localhost:8000` in your browser

## Usage

### Basic Controls

- **Start/Pause**: Click button or press Space/Enter
- **Reset**: Click button or press R
- **Edit Time**: Click timer display or press E
- **Adjust Time**: Use arrow keys (↑↓) when timer is stopped/paused
- **Settings**: Click gear icon or press Ctrl/Cmd+S

### Settings

- **Game Duration**: Total game time in minutes (default: 32)
- **Swap Interval**: How often players swap in minutes (default: 1)
- **Timer Mode**: Count down from game duration or count up from zero
- **Interval Sound**: Choose from 6 different audio signals

### Installing as PWA

On mobile devices, when you open the app in a browser:
- iOS: Tap Share → Add to Home Screen
- Android: Tap menu → Install App / Add to Home Screen

## Audio Setup

Connect your device to the stadium PA system via:
- Aux cable (headphone jack)
- Bluetooth adapter
- USB audio interface

Volume is fixed at 100% - adjust on your device or PA system.

## Technical Details

- **Zero Dependencies**: Pure vanilla JavaScript (ES6 modules)
- **Web Audio API**: Precise audio scheduling
- **High-Precision Timing**: requestAnimationFrame + performance.now()
- **Offline Support**: Service worker caches all assets
- **No Build Step**: Deploy as-is to any static host

## File Structure

```
hockey-timer/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support
├── css/
│   ├── main.css           # Base styles
│   ├── timer.css          # Timer display
│   ├── controls.css       # Buttons
│   └── responsive.css     # Mobile layout
├── js/
│   ├── app.js            # Application orchestration
│   ├── timer.js          # Core timer logic
│   ├── audio.js          # Web Audio API
│   ├── ui.js             # DOM management
│   ├── settings.js       # LocalStorage
│   └── constants.js      # Configuration
├── sounds/               # Audio files
└── icons/               # PWA icons (192x192, 512x512)

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## License

MIT License - Feel free to use and modify for your hockey team!
