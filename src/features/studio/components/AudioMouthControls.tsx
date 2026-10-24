import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Upload, Volume2 } from 'lucide-react'

type AudioMouthState = {
  mouthOpen: number
  mouthEnabled: boolean
  setMouthOpen: (value: number) => void
  setMouthEnabled: (value: boolean) => void
}

const AudioMouthContext = createContext<AudioMouthState | null>(null)

export function AudioMouthProvider({ children }: { children: ReactNode }) {
  const [mouthOpen, setMouthOpen] = useState(0)
  const [mouthEnabled, setMouthEnabled] = useState(false)
  return (
    <AudioMouthContext.Provider value={{ mouthOpen, mouthEnabled, setMouthOpen, setMouthEnabled }}>
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
  const { setMouthOpen: onMouthOpen, setMouthEnabled: onMouthEnabled } = useAudioMouth()
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    void contextRef.current?.close()
  }, [])

  useEffect(() => {
    if (!audioUrl) return
    return () => URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  const chooseAudio = (file?: File) => {
    if (!file) return
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setFileName(file.name)
    setAudioUrl(URL.createObjectURL(file))
    onMouthOpen(0)
    onMouthEnabled(true)
  }

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
          const open = Math.max(0, Math.min(1, (rms - 0.025) * 5.5))
          onMouthOpen(open)
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
        <span>{t('Animation de la bouche par audio')}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="audio-mouth-file-input"
        aria-label={t('Choisir un fichier audio')}
        onChange={event => chooseAudio(event.currentTarget.files?.[0])}
      />
      <button type="button" className="audio-mouth-upload" onClick={() => inputRef.current?.click()}>
        <Upload size={15} /> {fileName || t('Choisir un audio')}
      </button>
      {audioUrl && (
        <audio
          ref={audioRef}
          className="audio-mouth-player"
          controls
          src={audioUrl}
          onPlay={() => void analyzeAudio()}
          onPause={() => onMouthOpen(0)}
          onEnded={() => onMouthOpen(0)}
        />
      )}
      <p>{t('La bouche suit le volume audio et reste fermée pendant le silence.')}</p>
    </div>
  )
}
