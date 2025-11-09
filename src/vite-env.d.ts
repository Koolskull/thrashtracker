/// <reference types="vite/client" />

declare module 'webmidi' {
  export interface MIDIInput {
    name: string
    type: 'input' | 'output'
    addListener(event: string, channel: string | 'all', callback: (e: any) => void): void
    removeListener(): void
  }

  export interface MIDIOutput {
    name: string
    type: 'input' | 'output'
  }

  export interface WebMidi {
    enabled: boolean
    inputs: MIDIInput[]
    outputs: MIDIOutput[]
    enable(callback: (err?: Error) => void): void
    disable(): void
    addListener(event: string, callback: (e: any) => void): void
  }

  const WebMidi: WebMidi
  export default WebMidi
}

