import { Move3D, RotateCcw, Scan } from 'lucide-react'
import { motion } from 'motion/react'
import { type CSSProperties, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

import { defaultExpression } from '@/features/avatar/presets'
import { poseFromExpression, renderMouthGeometry } from '@/features/avatar/geometry'
import { AvatarCanvas } from '@/features/rendering/components/AvatarCanvas'
import { PhotoStageFrame } from '@/features/studio/components/PhotoStageFrame'
import { StudioIdentity } from '@/features/studio/components/StudioIdentity'
import type { StudioController } from '@/features/studio/useStudioController'
import { useAudioMouth } from '@/features/studio/components/AudioMouthControls'

export function StudioStage({ controller }: { controller: StudioController }) {
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
    transitionToExpression,
    updateHighlight,
    updateImmediate,
  } = controller
  const { mouthOpen, mouthEnabled, mouthWidth, mouthHeight, mouthOffset, mouthHorizontal, mouthRotation, setMouthWidth, setMouthHeight, setMouthOffset, setMouthHorizontal, setMouthRotation } = useAudioMouth()
  const [mouthBounds, setMouthBounds] = useState({ x: -20, y: 20, width: 40, height: 12 })
  useEffect(() => {
    renderedScene.mouthWidth.set(mouthWidth)
    renderedScene.mouthHeight.set(mouthHeight)
    renderedScene.mouthOffset.set(mouthOffset)
    renderedScene.mouthHorizontal.set(mouthHorizontal)
    renderedScene.mouthRotation.set(mouthRotation)
    renderedScene.mouthOpen.set(mouthOpen)
    renderedScene.mouthEnabled.set(mouthEnabled ? 1 : 0)
    const geometry = renderMouthGeometry(
      renderedScene.pose.current ?? poseFromExpression(canvasExpression),
      surface,
      {
        width: mouthWidth,
        height: mouthHeight,
        offset: mouthOffset,
        horizontal: mouthHorizontal,
        rotation: mouthRotation,
        open: mouthEnabled ? mouthOpen : 0,
      }
    )
    renderedScene.mouthPath.set(geometry.path)
    setMouthBounds(current =>
      Math.abs(current.x - geometry.bounds.x) > 0.25 ||
      Math.abs(current.y - geometry.bounds.y) > 0.25 ||
      Math.abs(current.width - geometry.bounds.width) > 0.25 ||
      Math.abs(current.height - geometry.bounds.height) > 0.25
        ? geometry.bounds
        : current
    )
  }, [canvasExpression, surface, mouthWidth, mouthHeight, mouthOffset, mouthHorizontal, mouthRotation, mouthOpen, mouthEnabled, renderedScene])
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
      mouthWidth={mouthWidth}
      mouthHeight={mouthHeight}
      mouthOffset={mouthOffset}
      mouthHorizontal={mouthHorizontal}
      mouthRotation={mouthRotation}
      mouthBounds={mouthBounds}
      onMouthWidthChange={setMouthWidth}
      onMouthHeightChange={setMouthHeight}
      onMouthOffsetChange={setMouthOffset}
      onMouthHorizontalChange={setMouthHorizontal}
      onMouthRotationChange={setMouthRotation}
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
    </motion.section>
  )
}
