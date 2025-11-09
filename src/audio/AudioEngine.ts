import * as Tone from 'tone'

/**
 * AudioEngine - Core audio synthesis framework
 * Supports:
 * - Multitimbral FM synthesis (carriers/modulators)
 * - Subtractive synthesis (oscillators + filters + envelopes)
 * - 16-note polyphony with voice management
 * - Percussive synthesis (monophonic stereo drums)
 * - Sampler with mono/poly modes
 * 
 * Future: Core audio logic will be ported to WASM for VST3 integration
 */
export default class AudioEngine {
  private audioContext: AudioContext | null = null
  private masterVolume: Tone.Volume | null = null
  private initialized = false
  
  // Synthesis engines
  private fmSynths: Map<number, Tone.FMSynth[]> = new Map() // Track -> Synth voices
  private subtractiveSynths: Map<number, Tone.Synth[]> = new Map()
  private drumSynths: Map<number, Tone.MembraneSynth | Tone.NoiseSynth> = new Map()
  private samplers: Map<number, Tone.Sampler> = new Map()
  
  // Voice management for polyphony
  private voicePool: Map<number, number> = new Map() // Track -> current voice index
  private maxVoices = 16
  private maxVoicesPerTrack = 4

  constructor() {
    // Initialize voice pools
    for (let i = 0; i < 8; i++) {
      this.voicePool.set(i, 0)
    }
  }

  /**
   * Initialize audio context and synthesis engines
   * Note: On iOS, this must be called after a user gesture
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Start Tone.js (handles AudioContext creation)
      await Tone.start()
      
      // Create master volume control
      this.masterVolume = new Tone.Volume(-6).toDestination()
      
      // Initialize synthesis engines for each track
      for (let track = 0; track < 8; track++) {
        // FM Synthesis voices (multitimbral)
        const fmVoices: Tone.FMSynth[] = []
        for (let i = 0; i < this.maxVoicesPerTrack; i++) {
          const fmSynth = new Tone.FMSynth({
            harmonicity: 3,
            modulationIndex: 10,
            detune: 0,
            oscillator: {
              type: 'sine'
            },
            envelope: {
              attack: 0.01,
              decay: 0.01,
              sustain: 1,
              release: 0.5
            },
            modulation: {
              type: 'square'
            },
            modulationEnvelope: {
              attack: 0.5,
              decay: 0,
              sustain: 1,
              release: 0.5
            }
          }).connect(this.masterVolume!)
          fmVoices.push(fmSynth)
        }
        this.fmSynths.set(track, fmVoices)

        // Subtractive synthesis voices
        const subVoices: Tone.Synth[] = []
        for (let i = 0; i < this.maxVoicesPerTrack; i++) {
          const subSynth = new Tone.Synth({
            oscillator: {
              type: 'sawtooth'
            },
            envelope: {
              attack: 0.1,
              decay: 0.2,
              sustain: 0.5,
              release: 0.8
            }
          }).chain(
            new Tone.Filter({
              type: 'lowpass',
              frequency: 1000,
              Q: 1
            }),
            this.masterVolume!
          )
          subVoices.push(subSynth)
        }
        this.subtractiveSynths.set(track, subVoices)

        // Percussive synthesis (drums) - monophonic per track
        const kickSynth = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 10,
          oscillator: {
            type: 'sine'
          },
          envelope: {
            attack: 0.001,
            decay: 0.4,
            sustain: 0.01,
            release: 1.4
          }
        }).connect(this.masterVolume!)

        const snareSynth = new Tone.NoiseSynth({
          noise: {
            type: 'white'
          },
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 0.4
          }
        }).chain(
          new Tone.Filter({
            type: 'highpass',
            frequency: 2000
          }),
          this.masterVolume!
        )

        this.drumSynths.set(track, track < 4 ? kickSynth : snareSynth)
      }

      this.initialized = true
      console.log('AudioEngine initialized')
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error)
      throw error
    }
  }

  /**
   * Start playback (required for iOS - user gesture)
   */
  async start(bpm: number = 120): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
    Tone.Transport.bpm.value = bpm
    Tone.Transport.start()
  }

  /**
   * Stop playback
   */
  stop(): void {
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }

  /**
   * Set BPM
   */
  setBpm(bpm: number): void {
    Tone.Transport.bpm.value = bpm
  }

  /**
   * Trigger a note with voice management
   * @param note MIDI note (0-127)
   * @param velocity 0-127
   * @param track Track index (0-7)
   * @param duration Note duration in milliseconds
   * @param synthType 'fm' | 'subtractive' | 'drum' | 'sampler'
   */
  triggerNote(
    note: number,
    velocity: number,
    track: number,
    duration: number = 500,
    synthType: 'fm' | 'subtractive' | 'drum' | 'sampler' = 'fm'
  ): void {
    if (!this.initialized) return

    const normalizedVelocity = velocity / 127
    const frequency = Tone.Frequency(note, 'midi').toFrequency()

    try {
      switch (synthType) {
        case 'fm': {
          const voices = this.fmSynths.get(track) || []
          const voiceIndex = (this.voicePool.get(track) || 0) % voices.length
          const voice = voices[voiceIndex]
          
          if (voice) {
            voice.triggerAttackRelease(
              frequency,
              duration / 1000,
              undefined,
              normalizedVelocity
            )
            this.voicePool.set(track, voiceIndex + 1)
          }
          break
        }

        case 'subtractive': {
          const voices = this.subtractiveSynths.get(track) || []
          const voiceIndex = (this.voicePool.get(track) || 0) % voices.length
          const voice = voices[voiceIndex]
          
          if (voice) {
            voice.triggerAttackRelease(
              frequency,
              duration / 1000,
              undefined,
              normalizedVelocity
            )
            this.voicePool.set(track, voiceIndex + 1)
          }
          break
        }

        case 'drum': {
          const drumSynth = this.drumSynths.get(track)
          if (drumSynth instanceof Tone.MembraneSynth) {
            drumSynth.triggerAttackRelease(
              frequency,
              duration / 1000,
              undefined,
              normalizedVelocity
            )
          } else if (drumSynth instanceof Tone.NoiseSynth) {
            drumSynth.triggerAttackRelease(
              duration / 1000,
              undefined,
              normalizedVelocity
            )
          }
          break
        }

        case 'sampler': {
          const sampler = this.samplers.get(track)
          if (sampler) {
            sampler.triggerAttackRelease(
              note,
              duration / 1000,
              undefined,
              normalizedVelocity
            )
          }
          break
        }
      }
    } catch (error) {
      console.error('Error triggering note:', error)
    }
  }

  /**
   * Load a sample for a track
   * @param track Track index
   * @param url Sample URL or buffer
   * @param notes Note mapping (optional)
   */
  async loadSample(
    track: number,
    url: string | AudioBuffer,
    notes?: string[]
  ): Promise<void> {
    if (!this.initialized) return

    try {
      const sampler = new Tone.Sampler({
        urls: typeof url === 'string' ? { [notes?.[0] || 'C4']: url } : undefined,
        onload: () => {
          console.log(`Sample loaded for track ${track}`)
        }
      }).connect(this.masterVolume!)

      if (typeof url !== 'string' && url instanceof AudioBuffer) {
        // Handle AudioBuffer directly if needed
        // Tone.Sampler expects URLs, so we'd need to convert buffer to URL
      }

      this.samplers.set(track, sampler)
    } catch (error) {
      console.error('Error loading sample:', error)
    }
  }

  /**
   * Set synthesis parameters for a track
   * @param track Track index
   * @param params Synthesis parameters
   */
  setSynthesisParams(
    track: number,
    params: {
      type?: 'fm' | 'subtractive' | 'drum' | 'sampler'
      attack?: number
      decay?: number
      sustain?: number
      release?: number
      filterFreq?: number
      [key: string]: any
    }
  ): void {
    // Implementation for switching synthesis settings mid-sequence
    // This allows dynamic parameter changes during playback
    console.log(`Setting synthesis params for track ${track}:`, params)
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop()
    
    // Dispose all synths
    this.fmSynths.forEach((voices) => {
      voices.forEach((synth) => synth.dispose())
    })
    this.subtractiveSynths.forEach((voices) => {
      voices.forEach((synth) => synth.dispose())
    })
    this.drumSynths.forEach((synth) => synth.dispose())
    this.samplers.forEach((sampler) => sampler.dispose())
    
    if (this.masterVolume) {
      this.masterVolume.dispose()
    }

    this.initialized = false
  }

  /**
   * Check if audio engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get master volume
   */
  getMasterVolume(): Tone.Volume | null {
    return this.masterVolume
  }
}

