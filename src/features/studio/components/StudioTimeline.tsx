import { AudioLines, Music2, Pause, Play, UserRound, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ExpressionPreview } from '@/features/avatar/components/ExpressionWorkspace'
import { resolveSequenceExpression } from '@/features/animation/sequences'
import { AudioMouthControls, useAudioMouth } from '@/features/studio/components/AudioMouthControls'
import type { StudioController } from '@/features/studio/useStudioController'

export function StudioTimeline({ controller }: { controller: StudioController }) {
  const {
    activeAvatar, activeAvatarEyes, activeExpression, activeSequence, expressions,
    setMode, statePlaying, toggleStatePlayback, transitionToExpression, t,
  } = controller
  const {
    audioPeaks,
    audioDuration,
    fileName,
    requestAudioFile,
    audioCurrentTime,
    audioPlaying,
    audioUrl,
    toggleAudioPlayback,
  } = useAudioMouth()
  const [zoom, setZoom] = useState(1)

  const keyframes = useMemo(() => {
    if (activeSequence?.steps.length) {
      return activeSequence.steps.flatMap((step, index) => {
        const resolved = resolveSequenceExpression(expressions, step.expressionId)
        if (!resolved.expression) return []
        return [{
          id: step.id,
          expression: resolved.expression,
          expressionIndex: resolved.index,
          time: activeSequence.steps.slice(0, index).reduce((sum, item) => sum + item.holdMs, 0),
          duration: step.holdMs,
        }]
      })
    }
    return expressions.map((expression, index) => ({
      id: expression.id,
      expression,
      expressionIndex: index,
      time: index * 1000,
      duration: 1000,
    }))
  }, [activeSequence, expressions])

  const sequenceDuration = keyframes.reduce((sum, frame) => sum + frame.duration, 0)
  const totalDuration = Math.max(1000, sequenceDuration, audioDuration * 1000)
  const playheadPercent =
    audioDuration > 0 ? Math.min(100, Math.max(0, (audioCurrentTime / audioDuration) * 100)) : 0
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }
  const trackWidth = `${Math.max(100, zoom * 100)}%`

  return (
    <section className="studio-timeline" aria-label={t('Animation timeline')}>
      <div className="studio-timeline-body">
        <div className="studio-timeline-fixed-labels" aria-label={t('Timeline tracks')}>
          <div className="timeline-label-spacer" aria-hidden="true" />
          <button type="button" className="studio-timeline-track-label avatar-track-label" aria-label={t('Avatar track')} onClick={() => setMode('avatars')}>
            <UserRound size={18} />
          </button>
          <button type="button" className="studio-timeline-track-label audio-track-label" aria-label={t('Select audio file')} onClick={requestAudioFile}>
            <Music2 size={18} />
          </button>
        </div>
        <div className="studio-timeline-scroll">
          <div className="studio-timeline-ruler" style={{ width: trackWidth, minWidth: trackWidth }}>
            {Array.from({ length: 6 }, (_, index) => <span key={index}>{formatTime((totalDuration * index) / 5)}</span>)}
          </div>
          <div className="studio-timeline-track-row">
            <div className="studio-timeline-track avatar-track" style={{ width: trackWidth, minWidth: trackWidth }}>
              {keyframes.map((frame, frameIndex) => (
                <button
                  className={`studio-timeline-keyframe${activeExpression === frame.expressionIndex ? ' is-active' : ''}${frameIndex === 0 ? ' is-first' : ''}`}
                  key={frame.id}
                  type="button"
                  style={{ left: frameIndex === 0 ? '0px' : `${(frame.time / totalDuration) * 100}%`, transform: frameIndex === 0 ? 'none' : undefined }}
                  aria-label={`${t('Keyframe')} ${(frame.expressionIndex ?? 0) + 1} · ${formatTime(frame.time)}`}
                  onClick={() => transitionToExpression(frame.expression, frame.expressionIndex)}
                >
                  <ExpressionPreview
                    expression={frame.expression}
                    surface={activeAvatar.body.primary}
                    bodyNodes={activeAvatar.body.nodes}
                    colors={activeAvatar.colors}
                    avatarEyes={activeAvatarEyes}
                    renderStyle={activeAvatar.renderStyle}
                    id={`timeline-${frame.id}`}
                  />
                </button>
              ))}
              {audioUrl && <span className="studio-timeline-playhead" style={{ left: `${playheadPercent}%` }} aria-hidden="true" />}
            </div>
          </div>
          <div className="studio-timeline-track-row audio-track-row">
            <div className={`studio-timeline-track audio-track${audioPeaks.length ? ' has-waveform' : ' is-empty'}`} style={{ width: trackWidth, minWidth: trackWidth }}>
              {audioPeaks.length ? (
                <div className="timeline-waveform" aria-label={fileName}>
                  {audioPeaks.map((peak, index) => <span key={index} style={{ height: `${Math.max(10, peak * 100)}%` }} />)}
                  <span className="timeline-waveform-progress" style={{ width: `${playheadPercent}%` }} aria-hidden="true" />
                  <span className="studio-timeline-playhead audio-playhead" style={{ left: `${playheadPercent}%` }} aria-hidden="true" />
                </div>
              ) : (
                <button type="button" className="timeline-audio-empty" onClick={requestAudioFile}>
                  <AudioLines size={16} /> {t('Choose audio to show waveform')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="studio-timeline-audio-transport" aria-label={t('Timeline playback controls')}>
        <span className="studio-timeline-audio-name">{fileName || t('Audio track')}</span>
        <Button variant="ghost" size="icon-sm" type="button" aria-label={t('Zoom out timeline')} onClick={() => setZoom(value => Math.max(0.75, value - 0.25))}><ZoomOut size={15} /></Button>
        <Button variant="ghost" size="icon-sm" type="button" aria-label={t('Zoom in timeline')} onClick={() => setZoom(value => Math.min(2.5, value + 0.25))}><ZoomIn size={15} /></Button>
        <Button variant="secondary" size="icon-sm" type="button" aria-label={statePlaying || audioPlaying ? t('Pause') : t('Play')} onClick={() => {
          const shouldPause = statePlaying || audioPlaying
          if (shouldPause) {
            if (statePlaying) toggleStatePlayback()
            if (audioPlaying) toggleAudioPlayback()
          } else {
            if (!statePlaying) toggleStatePlayback()
            if (audioUrl && !audioPlaying) toggleAudioPlayback()
          }
        }}>
          {statePlaying || audioPlaying ? <Pause size={15} /> : <Play size={15} />}
        </Button>
      </div>
      <div className="timeline-audio-engine" aria-hidden="true"><AudioMouthControls t={t} /></div>
    </section>
  )
}
