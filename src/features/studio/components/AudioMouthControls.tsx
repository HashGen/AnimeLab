import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { RefObject } from 'react'
import { AudioLines, Upload, Volume2 } from 'lucide-react'
import { InspectorCard } from '@/app/components/common'
import { NumericField } from '@/app/components/controls'

type AudioMouthState = {
  mouthOpen: number
  mouthEnabled: boolean
  mouthWidth: number
  mouthHeight: number
  mouthOffset: number
  mouthHorizontal: number
  mouthRotation: number
  setMouthWidth: (value: number) => void
  setMouthHeight: (value: number) => void
  setMouthOffset: (value: number) => void
  setMouthHorizontal: (value: number) => void
  setMouthRotation: (value: number) => void
  setMouthOpen: (value: number) => void
  setMouthEnabled: (value: boolean) => void
  audioUrl: string | null
  fileName: string
  audioPeaks: number[]
  audioDuration: number
  audioCurrentTime: number
  audioPlaying: boolean
  audioElementRef: RefObject<HTMLAudioElement | null>
  setAudioCurrentTime: (value: number) => void
  setAudioPlaying: (value: boolean) => void
  toggleAudioPlayback: () => void
  stopAudioPlayback: () => void
  requestAudioFile: () => void
}

const AudioMouthContext = createContext<AudioMouthState | null>(null)

export function AudioMouthProvider({ children }: { children: ReactNode }) {
  const [mouthOpen, setMouthOpen] = useState(0)
  const [mouthEnabled, setMouthEnabled] = useState(false)
  // Start with a clearly horizontal, closed mouth instead of a circular one.
  const [mouthWidth, setMouthWidth] = useState(40)
  const [mouthHeight, setMouthHeight] = useState(12)
  const [mouthOffset, setMouthOffset] = useState(30)
  const [mouthHorizontal, setMouthHorizontal] = useState(0)
  const [mouthRotation, setMouthRotation] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [audioPeaks, setAudioPeaks] = useState<number[]>([])
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioElementRef = useRef<HTMLAudioElement>(null)
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
    setAudioCurrentTime(0)
    setAudioPlaying(false)
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
      mouthOpen, mouthEnabled, mouthWidth, mouthHeight, mouthOffset, mouthHorizontal, mouthRotation, setMouthWidth, setMouthHeight, setMouthOffset, setMouthHorizontal, setMouthRotation, setMouthOpen, setMouthEnabled,
      audioUrl, fileName, audioPeaks, audioDuration, audioCurrentTime, audioPlaying, audioElementRef,
      toggleAudioPlayback: () => {
        const audio = audioElementRef.current
        if (!audio || !audioUrl) return
        if (audio.paused) void audio.play().catch(() => {})
        else audio.pause()
      },
      stopAudioPlayback: () => {
        const audio = audioElementRef.current
        if (!audio) return
        audio.pause()
        audio.currentTime = 0
        setAudioCurrentTime(0)
        setMouthOpen(0)
      },
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

export function MouthPoseControls({ t }: { t: (value: string) => string }) {
  const {
    mouthWidth, mouthHeight, mouthOffset, mouthHorizontal, mouthRotation,
    setMouthWidth, setMouthHeight, setMouthOffset, setMouthHorizontal, setMouthRotation,
  } = useAudioMouth()
  const size = Math.max(mouthWidth, mouthHeight)
  const resizeProportionally = (nextSize: number) => {
    const factor = nextSize / Math.max(size, 1)
    setMouthWidth(Math.max(8, Math.min(110, mouthWidth * factor)))
    setMouthHeight(Math.max(8, Math.min(110, mouthHeight * factor)))
  }
  return (
    <div className="mouth-pose-controls">
      <InspectorCard className="compact">
        <h3>{t('Shape')}</h3>
        <div className="eye-columns">
          <NumericField label={t('Width')} value={mouthWidth} min={8} max={110} unit="u" onChange={setMouthWidth} />
          <NumericField label={t('Height')} value={mouthHeight} min={8} max={110} unit="u" onChange={setMouthHeight} />
          <NumericField label={t('Proportional size')} value={size} min={8} max={110} unit="u" onChange={resizeProportionally} />
        </div>
      </InspectorCard>
      <InspectorCard>
        <h3>{t('Position and spacing')}</h3>
        <div className="eye-columns">
          <NumericField label={t('Horizontal')} value={mouthHorizontal} min={-70} max={70} unit="u" onChange={setMouthHorizontal} />
          <NumericField label={t('Vertical')} value={mouthOffset} min={8} max={70} unit="u" onChange={setMouthOffset} />
        </div>
      </InspectorCard>
      <InspectorCard>
        <h3>{t('Local rotation')}</h3>
        <NumericField label={t('Rotation')} value={mouthRotation} min={-180} max={180} unit="°" onChange={setMouthRotation} />
      </InspectorCard>
    </div>
  )
}

export function AudioMouthControls({ t }: { t: (value: string) => string }) {
  const {
    setMouthOpen: onMouthOpen,
    setMouthEnabled: onMouthEnabled,
    audioUrl,
    fileName,
    requestAudioFile,
    audioElementRef,
    setAudioCurrentTime,
    setAudioPlaying,
  } = useAudioMouth()
  const contextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    void contextRef.current?.close()
  }, [])

  const analyzeAudio = async () => {
    const audio = audioElementRef.current
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
      {audioUrl ? (
        <audio
          ref={audioElementRef}
          className="audio-mouth-player"
          controls
          src={audioUrl}
          onPlay={() => {
            setAudioPlaying(true)
            onMouthEnabled(true)
            void analyzeAudio()
          }}
          onPause={() => { setAudioPlaying(false); onMouthOpen(0) }}
          onTimeUpdate={event => setAudioCurrentTime(event.currentTarget.currentTime)}
          onEnded={() => { setAudioPlaying(false); onMouthOpen(0) }}
        />
      ) : (
        <div className="audio-mouth-empty"><AudioLines size={20} /><span>{t('Select an audio file to create a real waveform and animate the mouth.')}</span></div>
      )}
      <p>{t('The mouth follows the actual audio volume and closes during silence.')}</p>
    </div>
  )
}
