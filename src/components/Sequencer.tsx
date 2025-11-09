import { useState, useEffect, useRef } from 'react'
import AudioEngine from '../audio/AudioEngine'
import MidiController from '../midi/MidiController'
import './Sequencer.css'
import anime from 'animejs'

interface SequencerProps {
  audioEngine: AudioEngine
  midiController: MidiController
  isPlaying: boolean
  currentPattern: string
  bpm: number
}

interface Pattern {
  id: string // Hexadecimal pattern name (e.g., '000x01')
  name: string
  steps: Step[][]
}

interface Step {
  note: number | null // MIDI note (0-127)
  velocity: number // 0-127
  instrument: number // Track/instrument index
  active: boolean
}

const NUM_STEPS = 16
const NUM_TRACKS = 8

export default function Sequencer({
  audioEngine,
  midiController,
  isPlaying,
  currentPattern,
  bpm
}: SequencerProps) {
  const [patterns, setPatterns] = useState<Pattern[]>(() => {
    // Initialize with default patterns (000x01 to 000xFF)
    const defaultPatterns: Pattern[] = []
    for (let i = 1; i <= 255; i++) {
      const hexId = `000x${i.toString(16).toUpperCase().padStart(2, '0')}`
      defaultPatterns.push({
        id: hexId,
        name: hexId,
        steps: Array(NUM_TRACKS).fill(null).map(() =>
          Array(NUM_STEPS).fill(null).map(() => ({
            note: null,
            velocity: 100,
            instrument: 0,
            active: false
          }))
        )
      })
    }
    return defaultPatterns
  })

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedTrack, setSelectedTrack] = useState(0)
  const [selectedStep, setSelectedStep] = useState<{ track: number; step: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<anime.AnimeInstance | null>(null)

  // Get current pattern
  const activePattern = patterns.find(p => p.id === currentPattern) || patterns[0]

  // Animation for step highlights
  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.pause()
    }

    if (isPlaying && gridRef.current) {
      animationRef.current = anime({
        targets: gridRef.current.querySelectorAll('.step-cell'),
        backgroundColor: [
          { value: 'var(--grid-cell)', duration: 0 },
          { value: 'var(--grid-cell-playing)', duration: 100 },
          { value: 'var(--grid-cell)', duration: 400 }
        ],
        easing: 'easeInOutQuad',
        delay: (el, i) => {
          const step = i % NUM_STEPS
          return step === currentStep ? 0 : 1000
        },
        loop: true
      })
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.pause()
      }
    }
  }, [isPlaying, currentStep])

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      setCurrentStep(0)
      return
    }

    const stepDuration = (60 / bpm / 4) * 1000 // 16th notes
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % NUM_STEPS
        
        // Trigger notes for current step
        activePattern.steps.forEach((trackSteps, trackIndex) => {
          const step = trackSteps[next]
          if (step.active && step.note !== null) {
            audioEngine.triggerNote(
              step.note,
              step.velocity,
              trackIndex,
              stepDuration
            )
          }
        })

        return next
      })
    }, stepDuration)

    return () => clearInterval(interval)
  }, [isPlaying, bpm, activePattern, audioEngine])

  const toggleStep = (track: number, step: number) => {
    setPatterns((prev) =>
      prev.map((pattern) => {
        if (pattern.id === currentPattern) {
          const newSteps = pattern.steps.map((t, tIdx) =>
            tIdx === track
              ? t.map((s, sIdx) =>
                  sIdx === step ? { ...s, active: !s.active } : s
                )
              : t
          )
          return { ...pattern, steps: newSteps }
        }
        return pattern
      })
    )
  }

  const setStepNote = (track: number, step: number, note: number | null) => {
    setPatterns((prev) =>
      prev.map((pattern) => {
        if (pattern.id === currentPattern) {
          const newSteps = pattern.steps.map((t, tIdx) =>
            tIdx === track
              ? t.map((s, sIdx) =>
                  sIdx === step ? { ...s, note } : s
                )
              : t
          )
          return { ...pattern, steps: newSteps }
        }
        return pattern
      })
    )
  }

  return (
    <div className="sequencer">
      <div className="sequencer-header">
        <div className="pattern-selector">
          <label>Pattern:</label>
          <select
            value={currentPattern}
            onChange={(e) => {
              // Pattern switching handled by MIDI CC
              console.log('Pattern switch:', e.target.value)
            }}
          >
            {patterns.slice(0, 16).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="step-indicator">
          {Array(NUM_STEPS)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className={`step-indicator-cell ${
                  i === currentStep ? 'active' : ''
                }`}
              >
                {i + 1}
              </div>
            ))}
        </div>
      </div>

      <div className="sequencer-grid" ref={gridRef}>
        <div className="track-headers">
          <div className="track-header-cell">Track</div>
          {Array(NUM_TRACKS)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className={`track-header-cell ${
                  selectedTrack === i ? 'selected' : ''
                }`}
                onClick={() => setSelectedTrack(i)}
              >
                {i + 1}
              </div>
            ))}
        </div>

        <div className="steps-container">
          <div className="step-numbers">
            {Array(NUM_STEPS)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="step-number-cell">
                  {i + 1}
                </div>
              ))}
          </div>

          <div className="tracks">
            {activePattern.steps.map((trackSteps, trackIndex) => (
              <div key={trackIndex} className="track">
                {trackSteps.map((step, stepIndex) => (
                  <div
                    key={stepIndex}
                    className={`step-cell ${
                      step.active ? 'active' : ''
                    } ${
                      stepIndex === currentStep && isPlaying ? 'playing' : ''
                    } ${
                      selectedStep?.track === trackIndex &&
                      selectedStep?.step === stepIndex
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      toggleStep(trackIndex, stepIndex)
                      setSelectedStep({ track: trackIndex, step: stepIndex })
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setStepNote(trackIndex, stepIndex, null)
                    }}
                    title={
                      step.note !== null
                        ? `Note: ${step.note} (${step.velocity})`
                        : 'Right-click to clear note'
                    }
                  >
                    {step.note !== null ? (
                      <span className="step-note">
                        {step.note}
                      </span>
                    ) : (
                      step.active && <span className="step-dot">•</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

