# TrashTracker

A music tracker sequencer with audio synthesis capabilities, designed to work as a cross-platform standalone app and eventually as a VST3 plugin. Features integration with custom Bluetooth MIDI controllers for note playback and hexadecimal-pattern activation.

## Features

- **Grid-based Sequencer**: 16 steps × 8 tracks with hexadecimal pattern naming (000x01 to 000xFF)
- **Multitimbral Audio Synthesis**:
  - FM Synthesis (Frequency Modulation with carriers/modulators)
  - Subtractive Synthesis (oscillators + filters + envelopes)
  - 16-note polyphony with voice management
  - Percussive synthesis for drums (monophonic stereo)
  - Sampler with mono/poly modes
- **MIDI Integration**: Web MIDI API support for Bluetooth MIDI controllers
- **Pattern Switching**: MIDI CC control for hexadecimal pattern activation
- **Cross-platform**: Ready for Capacitor (iOS/Android), Electron, and Tauri
- **VSCode-like UI**: Harsh contrast theme with pixelated KongText font

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tone.js**: Web Audio API helper for synthesis and sequencing
- **Anime.js**: Graphics and animations
- **Web MIDI API**: MIDI controller integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- For mobile builds: Capacitor CLI
- For desktop builds: Electron or Tauri (Rust)

### Installation

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build
```

### Font Setup

The app uses the KongText pixelated font. Place font files in `public/fonts/`:
- `KongText-Regular.woff2`
- `KongText-Regular.woff`
- `KongText-Regular.ttf`

If you don't have the font files, the app will fall back to `Courier New`.

## Cross-Platform Builds

### Capacitor (iOS/Android Mobile)

```bash
# Install Capacitor CLI
npm install -g @capacitor/cli

# Add platforms
npx cap add ios
npx cap add android

# Sync and open
npx cap sync
npx cap open ios
npx cap open android
```

**Note**: On iOS, audio requires a user gesture to start the AudioContext. The app handles this automatically.

### Electron (Desktop)

```bash
cd electron
npm install
npm start
```

### Tauri (Desktop - Smaller Bundle)

```bash
# Install Tauri CLI
npm install -g @tauri-apps/cli

# Build
npm run tauri build
```

## MIDI Controller Integration

The app supports Bluetooth MIDI controllers with the following mappings:

- **Notes**: Trigger synths/samples (mapped to tracks)
- **CC 0-255**: Pattern selection (000x01 to 000xFF)

Connect your Bluetooth MIDI controller and allow browser MIDI access when prompted.

## Architecture

### Audio Engine (`src/audio/AudioEngine.ts`)

Core synthesis framework supporting:
- Multitimbral FM and subtractive synthesis
- Voice management for 16-note polyphony
- Percussive synthesis (kicks, snares)
- Sample playback

**Future**: Core audio logic will be ported to WebAssembly (WASM) for VST3 integration.

### MIDI Controller (`src/midi/MidiController.ts`)

Handles Web MIDI API input:
- Note on/off events
- Control Change for pattern switching
- Bluetooth MIDI device connection

**Future**: For VST3, MIDI will be handled by the host DAW and passed via IPC.

### Sequencer Component (`src/components/Sequencer.tsx`)

Grid-based tracker interface:
- 16 steps × 8 tracks
- Hexadecimal pattern naming
- Step activation and note editing
- Anime.js animations for playback highlights

## VST3 Integration (Future)

The app is designed to be embedded in a VST3 plugin using:

1. **JUCE Framework**: Host the React app in a WebView
2. **WebAssembly**: Port core audio synthesis to WASM for low-latency performance
3. **IPC Communication**: Bridge between JUCE and React app for:
   - MIDI input from host DAW
   - Audio processing callbacks
   - Parameter automation

See code comments in `AudioEngine.ts` and `MidiController.ts` for integration points.

## Controller Manufacturing Notes

For custom Bluetooth MIDI controller integration:

- Use standard MIDI protocol (MIDI 1.0 or MIDI 2.0)
- Map pattern selection to CC 0-255
- Ensure low-latency Bluetooth connection (BLE MIDI recommended)
- Consider hardware buttons/encoders for pattern switching

## Development

### Project Structure

```
trashtracker/
├── src/
│   ├── components/       # React components
│   │   └── Sequencer.tsx
│   ├── audio/           # Audio synthesis engine
│   │   └── AudioEngine.ts
│   ├── midi/            # MIDI controller handling
│   │   └── MidiController.ts
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/
│   └── fonts/           # KongText font files
├── electron/            # Electron config
├── src-tauri/           # Tauri config
└── capacitor.config.json # Capacitor config
```

### Code Style

- TypeScript strict mode
- Functional React components with hooks
- Modular architecture for easy iteration
- Comments mark future VST3 integration points

## License

MIT

## Contributing

This is a work-in-progress project. Contributions welcome!

