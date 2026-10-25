import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AudioLines, Upload, Volume2 } from 'lucide-react'

type AudioMouthState = {
  mouthOpen: number
  mouthEnabled: boolean
  mouthWidth: number
  mouthHeight: number
  mouthOffset: number
  setMouthWidth: (value: number) => void
  setMouthHeight: (value: number) => void
  setMouthOffset: (value: number) => void
  setMouthOpen: (value: number) => void
  setMouthEnabled: (value: boolean) => void
  audioUrl: string | null
  fileName: string
  audioPeaks: number[]
  audioDuration: number
  requestAudioFile: () => void
}

const AudioMouthContext = createContext<AudioMouthState | null>(null)

export function AudioMouthProvider({ children }: { children: ReactNode }) {
  const [mouthOpen, setMouthOpen] = useState(0)
  const [mouthEnabled, setMouthEnabled] = useState(false)
  const [mouthWidth, setMouthWidth] = useState(40)
  const [mouthHeight, setMouthHeight] = useState(12)
  const [mouthOffset, setMouthOffset] = useState(28)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [audioPeaks, setAudioPeaks] = useState<number[]>([])
  const [audioDuration, setAudioDuration] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!audioUrl) return
    return () => URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  const loadAudio = async (file?: File) => {
    if (!file || !file.type.startsWith('audio/')) return
    setAudioUrl(URL.createObjectURL(file))
    setFileName(file.name)
    setAudioPeaks([])
    setAudioDuration(0)
    setMouthOpen(0)
    setMouthEnabled(true)
    try {
      const context = new AudioContext()
      const decoded = await context.decodeAudioData(await file.arrayBuffer())
      const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index))
      const count = 96
      const samplesPerPeak = Math.max(1, Math.floor(decoded.length / count))
      const peaks = Array.from({ length: count }, (_, peakIndex) => {
        const start = peakIndex * samplesPerPeak
        const end = Math.min(decoded.length, start + samplesPerPeak)
        let sum = 0
        let samples = 0
        for (let index = start; index < end; index += Math.max(1, Math.floor((end - start) / 80))) {
          let sample = 0
          for (const channel of channels) sample += channel[index] ?? 0
          sample /= Math.max(1, channels.length)
          sum += sample * sample
          samples++
        }
        return samples ? Math.sqrt(sum / samples) : 0
      })
      setAudioPeaks(peaks.map(peak => Math.min(1, peak * 3.8)))
      setAudioDuration(decoded.duration)
      await context.close()
    } catch {
      setAudioPeaks([])
      setAudioDuration(0)
    }
  }

  return (
    <AudioMouthContext.Provider value={{
      mouthOpen, mouthEnabled, mouthWidth, mouthHeight, mouthOffset, setMouthWidth, setMouthHeight, setMouthOffset, setMouthOpen, setMouthEnabled,
      audioUrl, fileName, audioPeaks, audioDuration,
      requestAudioFile: () => inputRef.current?.click(),
    }}>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="audio-mouth-file-input"
        aria-label="Choose audio file for timeline"
        onChange={event => {
          void loadAudio(event.currentTarget.files?.[0])
          event.currentTarget.value = ''
        }}
      />
      {children}
    </AudioMouthContext.Provider>
  )
}

export function useAudioMouth() {
  const value = useContext(AudioMouthContext)
  if (!value) throw new Error('useAudioMouth must be used inside AudioMouthProvider')
  return value
}

export function AudioMouthControls({ t }: { t: (value: string) => string }) {
  const {
    setMouthOpen: onMouthOpen,
    setMouthEnabled: onMouthEnabled,
    mouthWidth,
    mouthHeight,
    mouthOffset,
    setMouthWidth,
    setMouthHeight,
    setMouthOffset,
    audioUrl,
    fileName,
    requestAudioFile,
  } = useAudioMouth()
  const audioRef = useRef<HTMLAudioElement>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    void contextRef.current?.close()
  }, [])

  const analyzeAudio = async () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    try {
      const AudioContextClass = window.AudioContext
      if (!AudioContextClass) return
      let context = contextRef.current
      if (!context) {
        context = new AudioContextClass()
        contextRef.current = context
        const source = context.createMediaElementSource(audio)
        const analyser = context.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        analyser.connect(context.destination)
        ;(audio as HTMLAudioElement & { __mouthAnalyser?: AnalyserNode }).__mouthAnalyser = analyser
      }
      await context.resume()
      const analyser = (audio as HTMLAudioElement & { __mouthAnalyser?: AnalyserNode }).__mouthAnalyser
      if (!analyser) return
      const samples = new Uint8Array(analyser.fftSize)
      const tick = () => {
        if (!audio.paused && !audio.ended) {
          analyser.getByteTimeDomainData(samples)
          let energy = 0
          for (const sample of samples) {
            const normalized = (sample - 128) / 128
            energy += normalized * normalized
          }
          const rms = Math.sqrt(energy / samples.length)
          onMouthOpen(Math.max(0, Math.min(1, (rms - 0.025) * 5.5)))
          frameRef.current = requestAnimationFrame(tick)
        } else {
          onMouthOpen(0)
          frameRef.current = null
        }
      }
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      tick()
    } catch {
      onMouthOpen(0)
    }
  }

  return (
    <div className="audio-mouth-controls">
      <div className="audio-mouth-heading">
        <Volume2 size={16} />
        <span>{t('Audio-driven mouth animation')}</span>
      </div>
      <button type="button" className="audio-mouth-upload" onClick={requestAudioFile}>
        <Upload size={15} /> {fileName || t('Choose audio')}
      </button>
      <div className="audio-mouth-shape-heading">{t('Mouth Shape')}</div>
      <label className="audio-mouth-width-control">
        <span>{t('Lip width')}</span>
        <input type="range" min="20" max="70" step="1" value={mouthWidth}
          onChange={event => setMouthWidth(Number(event.currentTarget.value))}
          aria-label={t('Lip width')} />
        <output>{mouthWidth}</output>
      </label>
      <label className="audio-mouth-width-control">
        <span>{t('Lip height')}</span>
        <input type="range" min="6" max="30" step="1" value={mouthHeight}
          onChange={event => setMouthHeight(Number(event.currentTarget.value))}
          aria-label={t('Lip height')} />
        <output>{mouthHeight}</output>
      </label>
      <label className="audio-mouth-width-control">
        <span>{t('Vertical position')}</span>
        <input type="range" min="8" max="52" step="1" value={mouthOffset}
          onChange={event => setMouthOffset(Number(event.currentTarget.value))}
          aria-label={t('Vertical position')} />
        <output>{mouthOffset}</output>
      </label>
      {audioUrl ? (
        <audio
          ref={audioRef}
          className="audio-mouth-player"
          controls
          src={audioUrl}
          onPlay={() => {
            onMouthEnabled(true)
            void analyzeAudio()
          }}
          onPause={() => onMouthOpen(0)}
          onEnded={() => onMouthOpen(0)}
        />
      ) : (
        <div className="audio-mouth-empty"><AudioLines size={20} /><span>{t('Select an audio file to create a real waveform and animate the mouth.')}</span></div>
      )}
      <p>{t('The mouth follows the actual audio volume and closes during silence.')}</p>
    </div>
  )
}
