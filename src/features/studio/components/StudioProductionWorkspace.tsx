import { Plus, Trash2, Upload, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ExpressionPreview } from '@/features/avatar/components/ExpressionWorkspace'
import type { StudioController } from '@/features/studio/useStudioController'

type SceneKeyframe = { id: string; timeMs: number; expressionId: string }
type SceneActor = {
  id: string
  avatarId: string
  x: number
  scale: number
  audioName: string
  audioUrl: string
  keyframes: SceneKeyframe[]
}

const makeId = () => `actor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Additive production workspace. It keeps scene composition separate from the
 * existing avatar renderer, expression geometry, and audio-mouth implementation.
 */
export function StudioProductionWorkspace({
  controller,
  onClose,
}: {
  controller: StudioController
  onClose: () => void
}) {
  const { activeAvatar, activeAvatarEyes, avatars, expression, expressions } = controller
  const [background, setBackground] = useState('#eaf0ff')
  const [timeMs, setTimeMs] = useState(0)
  const [actors, setActors] = useState<SceneActor[]>(() => [{
    id: makeId(),
    avatarId: activeAvatar.id,
    x: 50,
    scale: 1,
    audioName: '',
    audioUrl: '',
    keyframes: [{ id: makeId(), timeMs: 0, expressionId: expression.id }],
  }])
  const [selectedActorId, setSelectedActorId] = useState(actors[0]?.id ?? '')
  const selectedActor = actors.find(actor => actor.id === selectedActorId) ?? actors[0]
  const selectedAvatar = useMemo(
    () => avatars.find(avatar => avatar.id === selectedActor?.avatarId) ?? activeAvatar,
    [activeAvatar, avatars, selectedActor?.avatarId],
  )

  const updateActor = (id: string, update: Partial<SceneActor>) => {
    setActors(current => current.map(actor => actor.id === id ? { ...actor, ...update } : actor))
  }
  const addActor = () => {
    const actor: SceneActor = {
      id: makeId(),
      avatarId: activeAvatar.id,
      x: actors.length % 2 === 0 ? 72 : 28,
      scale: 1,
      audioName: '',
      audioUrl: '',
      keyframes: [{ id: makeId(), timeMs: 0, expressionId: expression.id }],
    }
    setActors(current => [...current, actor])
    setSelectedActorId(actor.id)
  }
  const addKeyframe = () => {
    if (!selectedActor) return
    setActors(current => current.map(actor => actor.id === selectedActor.id
      ? { ...actor, keyframes: [...actor.keyframes, { id: makeId(), timeMs, expressionId: expression.id }].sort((a, b) => a.timeMs - b.timeMs) }
      : actor))
  }
  const exportProject = () => {
    const payload = {
      version: 1,
      background,
      actors: actors.map(({ audioUrl: _audioUrl, ...actor }) => actor),
      note: 'Audio files must be selected again when importing this project.',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'avatar-video-project.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="production-workspace-backdrop" role="presentation">
      <section className="production-workspace" role="dialog" aria-modal="true" aria-label="Video production workspace">
        <header className="production-workspace-header">
          <div><span>AVATAR LAB</span><h2>Video Project</h2><p>Compose multiple characters without changing the existing avatar engine.</p></div>
          <button type="button" onClick={onClose} aria-label="Close video project"><X size={22} /></button>
        </header>

        <div className="production-workspace-preview" style={{ background }}>
          {actors.map((actor, index) => {
            const avatar = avatars.find(item => item.id === actor.avatarId) ?? activeAvatar
            const actorExpression = expressions.find(item => item.id === (actor.keyframes.filter(frame => frame.timeMs <= timeMs).at(-1)?.expressionId ?? expression.id)) ?? expression
            return (
              <div className="production-character" key={actor.id} style={{ left: `${actor.x}%`, transform: `translateX(-50%) scale(${actor.scale})`, zIndex: index + 1 }}>
                <svg className="production-3d-body" viewBox="0 0 140 190" aria-label="3D-style body preview">
                  <defs>
                    <linearGradient id={`body-${actor.id}`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" stopColor={avatar.colors.body} stopOpacity=".65" />
                      <stop offset=".48" stopColor={avatar.colors.body} />
                      <stop offset="1" stopColor="#111827" stopOpacity=".22" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="70" cy="174" rx="42" ry="8" fill="#111827" opacity=".14" />
                  <path d="M50 95 C35 105 31 127 30 151 L18 174 Q18 181 26 181 L43 180 L55 142 L58 118 Z" fill={`url(#body-${actor.id})`} />
                  <path d="M90 95 C105 105 109 127 110 151 L122 174 Q122 181 114 181 L97 180 L85 142 L82 118 Z" fill={`url(#body-${actor.id})`} />
                  <path d="M48 90 Q70 82 92 90 L103 139 Q70 154 37 139 Z" fill={`url(#body-${actor.id})`} stroke="#ffffff" strokeOpacity=".22" />
                  <path d="M52 139 L87 139 L92 177 Q70 184 48 177 Z" fill={`url(#body-${actor.id})`} />
                  <path d="M48 174 L67 174 L65 187 L42 187 Q38 182 48 174Z M74 174 L92 174 L101 187 L77 187Z" fill="#303747" />
                </svg>
                <div className="production-character-face">
                  <ExpressionPreview expression={actorExpression} surface={avatar.body.primary} bodyNodes={avatar.body.nodes} colors={avatar.colors} avatarEyes={avatar.eyes} renderStyle={avatar.renderStyle} id={`production-${actor.id}`} />
                </div>
                <span>{avatar.name}</span>
              </div>
            )
          })}
          {actors.length === 0 && <p>Add an avatar to start your scene.</p>}
        </div>

        <div className="production-workspace-controls">
          <section className="production-card">
            <h3>Scene</h3>
            <label>Background color<input type="color" value={background} onChange={event => setBackground(event.target.value)} /></label>
            <button type="button" className="production-primary" onClick={addActor}><Plus size={17} /> Add Another Avatar</button>
            <button type="button" onClick={exportProject}>Save Project File</button>
          </section>

          <section className="production-card">
            <h3>Characters & separate audio</h3>
            {actors.map((actor, index) => (
              <div className={`production-actor-row ${actor.id === selectedActorId ? 'selected' : ''}`} key={actor.id}>
                <button type="button" className="production-actor-select" onClick={() => setSelectedActorId(actor.id)}>Character {index + 1}</button>
                <select aria-label={`Avatar for character ${index + 1}`} value={actor.avatarId} onChange={event => updateActor(actor.id, { avatarId: event.target.value })}>
                  {avatars.map(avatar => <option key={avatar.id} value={avatar.id}>{avatar.name}</option>)}
                </select>
                <label className="production-upload"><Upload size={16} /> {actor.audioName || 'Choose this character audio'}
                  <input type="file" accept="audio/*" onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) updateActor(actor.id, { audioName: file.name, audioUrl: URL.createObjectURL(file) })
                  }} />
                </label>
                {actor.audioUrl && <audio controls preload="metadata" src={actor.audioUrl} />}
                <label>Scene position <input type="range" min="10" max="90" value={actor.x} onChange={event => updateActor(actor.id, { x: Number(event.target.value) })} /></label>
                <label>Size <input type="range" min=".55" max="1.4" step=".05" value={actor.scale} onChange={event => updateActor(actor.id, { scale: Number(event.target.value) })} /></label>
                <button type="button" className="production-danger" onClick={() => {
                  setActors(current => current.filter(item => item.id !== actor.id))
                  if (selectedActorId === actor.id) setSelectedActorId(actors.find(item => item.id !== actor.id)?.id ?? '')
                }} aria-label={`Remove character ${index + 1}`}><Trash2 size={16} /> Remove</button>
              </div>
            ))}
          </section>

          <section className="production-card">
            <h3>Expression keyframes</h3>
            <label>Time (seconds)<input type="number" min="0" step=".1" value={timeMs / 1000} onChange={event => setTimeMs(Math.max(0, Number(event.target.value) * 1000))} /></label>
            <button type="button" className="production-primary" onClick={addKeyframe} disabled={!selectedActor}><Plus size={17} /> Add Current Expression</button>
            <div className="production-keyframes">
              {selectedActor?.keyframes.map(frame => (
                <div key={frame.id}><span>{(frame.timeMs / 1000).toFixed(1)}s</span><span>{expressions.find(item => item.id === frame.expressionId)?.name ?? 'Expression'}</span></div>
              ))}
            </div>
            <p className="production-note">This workspace saves composition and keyframe data separately. The final synchronized multi-character video renderer is a separate next step; the existing single-avatar renderer remains unchanged.</p>
          </section>
        </div>
      </section>
    </div>
  )
}
