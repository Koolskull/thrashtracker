import { useState, useEffect } from 'react'
import Sequencer from './components/Sequencer'
import AudioEngine from './audio/AudioEngine'
import MidiController from './midi/MidiController'
import './App.css'

function App() {
  const [audioEngine] = useState(() => new AudioEngine())
  const [midiController] = useState(() => new MidiController())
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPattern, setCurrentPattern] = useState('000x01')
  const [bpm, setBpm] = useState(120)

  useEffect(() => {
    // Initialize audio engine
    audioEngine.initialize()
    
    // Initialize MIDI controller
    midiController.initialize(audioEngine, (pattern: string) => {
      setCurrentPattern(pattern)
    })

    // Cleanup
    return () => {
      audioEngine.cleanup()
      midiController.cleanup()
    }
  }, [audioEngine, midiController])

  const handlePlayPause = async () => {
    if (isPlaying) {
      audioEngine.stop()
      setIsPlaying(false)
    } else {
      // iOS requires user gesture to start AudioContext
      try {
        await audioEngine.start(bpm)
        setIsPlaying(true)
      } catch (error) {
        console.error('Failed to start audio:', error)
      }
    }
  }

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm)
    if (isPlaying) {
      audioEngine.setBpm(newBpm)
    }
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-title">
          <h1>ThrashTracker</h1>
          <span className="app-version">v0.1.0</span>
        </div>
        <div className="app-controls">
          <div className="transport-controls">
            <button onClick={handlePlayPause}>
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <button onClick={() => {
              audioEngine.stop()
              setIsPlaying(false)
            }}>⏹ STOP</button>
          </div>
          <div className="bpm-control">
            <label>BPM:</label>
            <input
              type="number"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
            />
          </div>
          <div className="pattern-display">
            <label>Pattern:</label>
            <span className="pattern-name">{currentPattern}</span>
          </div>
        </div>
      </div>
      
      <div className="app-content">
        <Sequencer
          audioEngine={audioEngine}
          midiController={midiController}
          isPlaying={isPlaying}
          currentPattern={currentPattern}
          bpm={bpm}
        />
      </div>
      
      <div className="app-footer">
        <div className="status-bar">
          <span>MIDI: {midiController.isConnected() ? '● Connected' : '○ Disconnected'}</span>
          <span>Audio: {audioEngine.isInitialized() ? '● Ready' : '○ Not Ready'}</span>
        </div>
      </div>
    </div>
  )
}

export default App

