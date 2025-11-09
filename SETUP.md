# Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add KongText font (optional):**
   - Download KongText font files
   - Place them in `public/fonts/`:
     - `KongText-Regular.woff2`
     - `KongText-Regular.woff`
     - `KongText-Regular.ttf`
   - If you don't have the font, the app will use `Courier New` as fallback

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## First Run

1. Open the app in your browser (usually `http://localhost:3000`)
2. Click the **PLAY** button to start the audio engine (required on iOS)
3. Connect a Bluetooth MIDI controller if available
4. Click on grid cells to activate steps
5. Use MIDI CC 0-255 to switch patterns (000x01 to 000xFF)

## Mobile Setup (Capacitor)

```bash
# Install Capacitor CLI globally
npm install -g @capacitor/cli

# Add platforms
npx cap add ios
npx cap add android

# Sync web assets
npx cap sync

# Open in Xcode/Android Studio
npx cap open ios
npx cap open android
```

**Important for iOS:**
- Audio requires a user gesture to start (handled automatically by PLAY button)
- Add MIDI capability in Xcode project settings
- Test on a real device for best audio performance

## Desktop Setup

### Electron
```bash
cd electron
npm install
npm start
```

### Tauri
```bash
# Install Rust and Tauri CLI
# See: https://tauri.app/v1/guides/getting-started/prerequisites

npm install -g @tauri-apps/cli
npm run tauri dev
```

## Troubleshooting

### MIDI Not Working
- Ensure browser supports Web MIDI API (Chrome, Edge, Opera)
- Grant MIDI permissions when prompted
- Check browser console for connection errors

### Audio Not Playing
- Click PLAY button (required for iOS user gesture)
- Check browser console for audio errors
- Ensure audio context is initialized (check status bar)

### Font Not Loading
- Verify font files are in `public/fonts/`
- Check browser console for 404 errors
- App will fallback to `Courier New` if font missing

## Development Notes

- TypeScript strict mode enabled
- ESLint configured for React + TypeScript
- Hot module replacement enabled in dev mode
- Source maps enabled for debugging

