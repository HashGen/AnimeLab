import { Camera, Info, Move3D, RotateCcw, Scan, Upload, Volume2 } from 'lucide-react'
import { motion } from 'motion/react'
import { type CSSProperties, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { defaultExpression } from '@/features/avatar/presets'
import { AvatarCanvas } from '@/features/rendering/components/AvatarCanvas'
import { PhotoStageFrame } from '@/features/studio/components/PhotoStageFrame'
import { StudioIdentity } from '@/features/studio/components/StudioIdentity'
import type { StudioController } from '@/features/studio/useStudioController'

function AudioMouthControls({
  onMouthOpen,
  onMouthEnabled,
  t,
}: {
  onMouthOpen: (value: number) => void
  onMouthEnabled: (value: boolean) => void
  t: (value: string) => string
}) {
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

export function StudioStage({ controller }: { controller: StudioController }) {
  const [photoHelpOpen, setPhotoHelpOpen] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(0)
  const [mouthEnabled, setMouthEnabled] = useState(false)
  const {
    activeAvatar,
    activeAvatarEyes,
    activeSequenceLabel,
    bodyEditing,
    canvasExpression,
    commitBodyNode,
    editing,
    expression,
    freezeLivePreviewForManipulation,
    highlight,
    linked,
    mode,
    openPhotoMode,
    persistEditedEyeExpression,
    photoFlash,
    photoTool,
    playbackStatus,
    previewCanvasExpression,
    previewExpressionDraft,
    previewSelectedBodyNode,
    renderedColors,
    renderedRotationGizmo,
    renderedScene,
    selectBodyNode,
    selectedBodyNode,
    selectedBodyNodeId,
    selectedEyeSide,
    setEditing,
    setPhotoPanelSections,
    setPhotoTool,
    setSelectedEyeSide,
    setSnapshotComposition,
    showWire,
    snapshotBackground,
    snapshotColorFrom,
    snapshotColorTo,
    snapshotComposition,
    surface,
    t,
    takePicture,
    transitionToExpression,
    updateHighlight,
    updateImmediate,
  } = controller
  const photoMode = mode === 'photo'
  const activatePhotoTool = (tool: typeof photoTool) => {
    setPhotoTool(tool)
    setPhotoPanelSections(current => (current.includes(tool) ? current : [...current, tool]))
  }
  const resetPhotoSetup = () => {
    updateImmediate({ ...defaultExpression })
    setSnapshotComposition(current => ({ ...current, x: 0, y: 0, scale: 1 }))
  }
  const avatarCanvas = (
    <AvatarCanvas
      expression={canvasExpression}
      avatarEyes={activeAvatarEyes}
      surface={surface}
      scene={renderedScene}
      colors={renderedColors}
      renderStyle={activeAvatar.renderStyle}
      rotationGizmo={renderedRotationGizmo}
      showWire={showWire}
      bodyEditing={bodyEditing}
      selectedBodyNodeId={selectedBodyNodeId}
      selectedBodyNode={selectedBodyNode}
      selectedSide={selectedEyeSide}
      linked={linked}
      highlight={highlight}
      onHighlightChange={updateHighlight}
      onBodyNodeSelect={selectBodyNode}
      onBodyNodePreview={previewSelectedBodyNode}
      onBodyNodeChange={commitBodyNode}
      onEyeSelect={setSelectedEyeSide}
      onPreview={previewCanvasExpression}
      onChange={editing ? previewExpressionDraft : updateImmediate}
      onReset={next => {
        if (editing) {
          setEditing(current => (current ? { ...current, draft: next } : current))
        }
        transitionToExpression(next)
      }}
      onEyeChange={
        editing ? previewExpressionDraft : bodyEditing ? persistEditedEyeExpression : undefined
      }
      playback={
        activeSequenceLabel && playbackStatus !== 'stopped'
          ? { name: activeSequenceLabel, status: playbackStatus }
          : null
      }
      onManipulationStart={freezeLivePreviewForManipulation}
      mouthOpen={mouthOpen}
      mouthEnabled={mouthEnabled}
    />
  )
  return (
    <motion.section
      className={`stage-column${photoMode ? ' photo-mode-active' : ''}`}
      style={
        {
          '--avatar-body-color': renderedColors.body,
          '--avatar-eye-color': renderedColors.eyes,
        } as CSSProperties
      }
    >
      <StudioIdentity
        className="stage-identity"
        language={controller.language}
        setLanguage={controller.setLanguage}
        t={t}
      />
      {photoMode ? (
        <PhotoStageFrame
          background={snapshotBackground}
          colorFrom={snapshotColorFrom}
          colorTo={snapshotColorTo}
          composition={snapshotComposition}
          tool={photoTool}
          onCompositionChange={setSnapshotComposition}
        >
          {avatarCanvas}
        </PhotoStageFrame>
      ) : (
        avatarCanvas
      )}
      {!photoMode && <AudioMouthControls onMouthOpen={setMouthOpen} onMouthEnabled={setMouthEnabled} t={t} />}
      {photoFlash > 0 && (
        <motion.div
          className="photo-flash"
          key={photoFlash}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.92, 0] }}
          transition={{ duration: 0.38, times: [0, 0.16, 1], ease: 'easeOut' }}
        />
      )}
      <TooltipProvider>
        {photoMode && (
          <div className="photo-tool-bar" role="toolbar" aria-label={t('Outils du mode photo')}>
            <Button
              variant="secondary"
              type="button"
              aria-pressed={photoTool === 'pose'}
              onClick={() => activatePhotoTool('pose')}
            >
              <Move3D />
              {t('Pose')}
            </Button>
            <Button
              variant="secondary"
              type="button"
              aria-pressed={photoTool === 'frame'}
              onClick={() => activatePhotoTool('frame')}
            >
              <Scan />
              {t('Cadrage')}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              type="button"
              aria-label={t('Réinitialiser la pose et le cadrage')}
              onClick={resetPhotoSetup}
            >
              <RotateCcw />
            </Button>
          </div>
        )}
        <div className="photo-capture-bar">
          <Button
            className="photo-capture-button"
            type="button"
            aria-label={t(photoMode ? 'Prendre une photo' : 'Ouvrir le mode photo')}
            onClick={() => (photoMode ? takePicture() : openPhotoMode())}
          >
            <Camera />
            <span className="photo-capture-label">
              {t(photoMode ? 'Prendre une photo' : 'Mode photo')}
            </span>
          </Button>
          <Tooltip
            open={photoHelpOpen}
            onOpenChange={open => {
              if (!open) setPhotoHelpOpen(false)
            }}
          >
            <TooltipTrigger
              closeOnClick={false}
              render={
                <Button
                  className="photo-help-button"
                  variant="secondary"
                  size="icon-sm"
                  type="button"
                  aria-label={t('Informations sur le mode photo')}
                  aria-expanded={photoHelpOpen}
                  onClick={() => setPhotoHelpOpen(open => !open)}
                />
              }
            >
              <Info />
            </TooltipTrigger>
            <TooltipContent side="top" className="photo-help-tooltip">
              {t(
                photoMode
                  ? 'Utilise Pose pour orienter l’avatar et Cadrage pour le déplacer ou le zoomer.'
                  : 'Ouvre le mode photo pour choisir une expression, cadrer puis exporter l’avatar.'
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <p className="stage-credit">
        Made with ❤️ by{' '}
        <a href="https://x.com/_smontlouis" target="_blank" rel="noreferrer">
          @_smontlouis
        </a>
        .
      </p>
    </motion.section>
  )
}
