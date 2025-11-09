import WebMidi from 'webmidi'
import AudioEngine from '../audio/AudioEngine'

/**
 * MidiController - Handles MIDI input from Bluetooth controller
 * Maps:
 * - Notes to trigger synths/samples
 * - CC values to activate/select hexadecimal patterns (000x01 to 000xFF)
 * 
 * Future: For VST3 integration, MIDI will be handled by the host DAW
 * and passed to the embedded WebView via IPC
 */
export default class MidiController {
  private audioEngine: AudioEngine | null = null
  private initialized = false
  private connected = false
  private currentPattern = '000x01'
  private patternCallback: ((pattern: string) => void) | null = null

  // Pattern mapping: CC value -> pattern ID
  // CC 0-255 maps to patterns 000x01 to 000xFF
  private readonly PATTERN_CC_START = 0
  private readonly PATTERN_CC_END = 255

  constructor() {
    // Pattern switching will be handled via MIDI CC
  }

  /**
   * Initialize Web MIDI API and connect to devices
   */
  async initialize(
    audioEngine: AudioEngine,
    patternCallback?: (pattern: string) => void
  ): Promise<void> {
    if (this.initialized) return

    this.audioEngine = audioEngine
    this.patternCallback = patternCallback || null

    try {
      await new Promise<void>((resolve, reject) => {
        WebMidi.enable((err) => {
          if (err) {
            console.error('WebMidi initialization failed:', err)
            reject(err)
            return
          }

          console.log('WebMidi enabled')
          console.log('Inputs:', WebMidi.inputs.map((i) => i.name))
          console.log('Outputs:', WebMidi.outputs.map((o) => o.name))

          // Connect to first available input (Bluetooth MIDI controller)
          if (WebMidi.inputs.length > 0) {
            this.connectToInput(WebMidi.inputs[0])
          } else {
            console.warn('No MIDI inputs found. Connect a Bluetooth MIDI controller.')
          }

          // Listen for new inputs
          WebMidi.addListener('connected', (e: any) => {
            console.log('MIDI device connected:', e.port.name)
            if (e.port.type === 'input' && !this.connected) {
              this.connectToInput(e.port as WebMidi.MIDIInput)
            }
          })

          WebMidi.addListener('disconnected', (e: any) => {
            console.log('MIDI device disconnected:', e.port.name)
            if (e.port.name === this.getCurrentInputName()) {
              this.connected = false
            }
          })

          this.initialized = true
          resolve()
        })
      })
    } catch (error) {
      console.error('Failed to initialize MidiController:', error)
      throw error
    }
  }

  /**
   * Connect to a specific MIDI input
   */
  private connectToInput(input: WebMidi.MIDIInput): void {
    try {
      // Remove existing listeners if any
      input.removeListener()

      // Note On/Off handlers
      input.addListener('noteon', 'all', (e) => {
        this.handleNoteOn(e.note.number, e.velocity)
      })

      input.addListener('noteoff', 'all', (e) => {
        this.handleNoteOff(e.note.number)
      })

      // Control Change handlers for pattern switching
      input.addListener('controlchange', 'all', (e) => {
        this.handleControlChange(e.controller.number, e.value)
      })

      this.connected = true
      console.log(`Connected to MIDI input: ${input.name}`)
    } catch (error) {
      console.error('Error connecting to MIDI input:', error)
    }
  }

  /**
   * Handle MIDI Note On
   */
  private handleNoteOn(note: number, velocity: number): void {
    if (!this.audioEngine) return

    // Map note to track (e.g., C3-C4 = track 0, C4-C5 = track 1, etc.)
    const track = Math.floor((note - 36) / 12) % 8
    const normalizedVelocity = Math.floor(velocity * 127)

    // Trigger note on audio engine
    // Default to FM synthesis, can be changed per track
    this.audioEngine.triggerNote(
      note,
      normalizedVelocity,
      track,
      500,
      'fm'
    )

    console.log(`Note On: ${note} (velocity: ${normalizedVelocity}) -> Track ${track}`)
  }

  /**
   * Handle MIDI Note Off
   */
  private handleNoteOff(note: number): void {
    // Note: Tone.js handles note off automatically via duration
    // But we can add explicit note off handling here if needed
    console.log(`Note Off: ${note}`)
  }

  /**
   * Handle MIDI Control Change
   * CC 0-255: Pattern selection (000x01 to 000xFF)
   */
  private handleControlChange(cc: number, value: number): void {
    // Pattern switching via CC
    if (cc >= this.PATTERN_CC_START && cc <= this.PATTERN_CC_END) {
      const patternIndex = value + 1 // Map 0-254 to 1-255
      const hexPattern = `000x${patternIndex.toString(16).toUpperCase().padStart(2, '0')}`
      
      if (hexPattern !== this.currentPattern) {
        this.currentPattern = hexPattern
        console.log(`Pattern switched via CC ${cc}: ${hexPattern}`)
        
        if (this.patternCallback) {
          this.patternCallback(hexPattern)
        }
      }
    }

    // Additional CC mappings can be added here:
    // - CC 16-23: Track volume
    // - CC 24-31: Track pan
    // - CC 32-39: Synthesis parameters
    // etc.
  }

  /**
   * Get current pattern
   */
  getCurrentPattern(): string {
    return this.currentPattern
  }

  /**
   * Set pattern manually (for testing)
   */
  setPattern(pattern: string): void {
    this.currentPattern = pattern
    if (this.patternCallback) {
      this.patternCallback(pattern)
    }
  }

  /**
   * Get current MIDI input name
   */
  private getCurrentInputName(): string {
    if (WebMidi.inputs.length > 0) {
      return WebMidi.inputs[0].name
    }
    return ''
  }

  /**
   * Check if MIDI is connected
   */
  isConnected(): boolean {
    return this.connected && this.initialized
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (WebMidi.enabled) {
      WebMidi.inputs.forEach((input) => {
        input.removeListener()
      })
      WebMidi.disable()
    }
    this.initialized = false
    this.connected = false
  }
}

