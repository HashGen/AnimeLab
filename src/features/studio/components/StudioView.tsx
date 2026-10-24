import { useEffect, useState } from 'react'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { StudioDialogs } from '@/features/studio/components/StudioDialogs'
import { StudioInspector } from '@/features/studio/components/StudioInspector'
import { StudioStage } from '@/features/studio/components/StudioStage'
import type { StudioController } from '@/features/studio/useStudioController'
import { AudioMouthProvider } from '@/features/studio/components/AudioMouthControls'

const STACKED_LAYOUT_QUERY = '(max-width: 980px)'

export function StudioView(controller: StudioController) {
  const [stackedLayout, setStackedLayout] = useState(
    () => window.matchMedia(STACKED_LAYOUT_QUERY).matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(STACKED_LAYOUT_QUERY)
    const updateStackedLayout = () => setStackedLayout(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateStackedLayout)
    return () => mediaQuery.removeEventListener('change', updateStackedLayout)
  }, [])

  return (
    <div className="studio-root studio-app-shell" lang={controller.language}>
      <AudioMouthProvider>
      {stackedLayout ? (
        <div className="studio studio-mobile-resizable studio-mobile-app-layout">
          <section className="mobile-stage-panel mobile-preview-dock" aria-label={controller.t('Aperçu')}>
            <StudioStage controller={controller} />
          </section>
          <section className="mobile-inspector-panel mobile-editor-dock" aria-label={controller.t('Éditeur')}>
            <StudioInspector controller={controller} />
          </section>
        </div>
      ) : (
        <div className="studio studio-desktop-layout">
          <StudioStage controller={controller} />
          <StudioInspector controller={controller} />
        </div>
      )}
      <StudioDialogs controller={controller} />
      </AudioMouthProvider>
    </div>
  )
}
