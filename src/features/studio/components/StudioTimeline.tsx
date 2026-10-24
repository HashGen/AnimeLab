import { Pause, Play, Square, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ExpressionPreview } from '@/features/avatar/components/ExpressionWorkspace'
import { resolveSequenceExpression } from '@/features/animation/sequences'
import type { StudioController } from '@/features/studio/useStudioController'

export function StudioTimeline({ controller }: { controller: StudioController }) {
  const {
    activeAvatar, activeAvatarEyes, activeExpression, activeSequence, expressions,
    statePlaying, stopState, toggleStatePlayback, transitionToExpression, t,
  } = controller
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
  const totalDuration = Math.max(1000, keyframes.reduce((sum, frame) => sum + frame.duration, 0))
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }
  const trackWidth = `${Math.max(100, zoom * 100)}%`

  return (
    <section className="studio-timeline" aria-label={t('Animation timeline')}>
      <header className="studio-timeline-header">
        <div className="studio-timeline-title">
          <span className="studio-timeline-mark" aria-hidden="true">▶</span>
          <div><strong>{t('Timeline')}</strong><small>{activeSequence?.name ? t(activeSequence.name) : t('Expression keyframes')}</small></div>
        </div>
        <div className="studio-timeline-actions">
          <span className="studio-timeline-time">{formatTime(0)} / {formatTime(totalDuration)}</span>
          <Button variant="ghost" size="icon-sm" type="button" aria-label={t('Zoom out timeline')} onClick={() => setZoom(value => Math.max(0.75, value - 0.25))}><ZoomOut size={15} /></Button>
          <Button variant="ghost" size="icon-sm" type="button" aria-label={t('Zoom in timeline')} onClick={() => setZoom(value => Math.min(2, value + 0.25))}><ZoomIn size={15} /></Button>
          <Button variant="secondary" size="icon-sm" type="button" aria-label={statePlaying ? t('Pause') : t('Play')} onClick={toggleStatePlayback}>{statePlaying ? <Pause size={15} /> : <Play size={15} />}</Button>
          <Button variant="ghost" size="icon-sm" type="button" aria-label={t('Stop')} onClick={() => stopState()}><Square size={14} /></Button>
        </div>
      </header>
      <div className="studio-timeline-scroll">
        <div className="studio-timeline-ruler" style={{ minWidth: trackWidth }}>
          {Array.from({ length: 6 }, (_, index) => <span key={index}>{formatTime((totalDuration * index) / 5)}</span>)}
        </div>
        <div className="studio-timeline-track-row">
          <div className="studio-timeline-track-label"><span className="timeline-track-dot avatar-dot" />{t('Avatar')}</div>
          <div className="studio-timeline-track" style={{ minWidth: trackWidth }}>
            {keyframes.map(frame => (
              <button
                className={`studio-timeline-keyframe${activeExpression === frame.expressionIndex ? ' is-active' : ''}`}
                key={frame.id}
                type="button"
                style={{ left: `${(frame.time / totalDuration) * 100}%` }}
                aria-label={`${t('Keyframe')} ${frame.expressionIndex + 1} · ${formatTime(frame.time)}`}
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
          </div>
        </div>
        <div className="studio-timeline-track-row audio-track-row">
          <div className="studio-timeline-track-label"><span className="timeline-track-dot audio-dot" />{t('Audio')}</div>
          <div className="studio-timeline-track audio-track">
            <div className="timeline-waveform" aria-hidden="true">
              {Array.from({ length: 72 }, (_, index) => <span key={index} style={{ height: `${18 + ((index * 37 + 13) % 66)}%` }} />)}
            </div>
            <span className="timeline-audio-caption">{t('Upload audio in the Audio tab')}</span>
          </div>
        </div>
      </div>
      <footer className="studio-timeline-footer">
        <span>{keyframes.length} {t('keyframes')}</span><span>{t('Select a keyframe to preview it')}</span>
      </footer>
    </section>
  )
}
