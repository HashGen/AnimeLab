import type { StudioController } from '@/features/studio/useStudioController'

type StudioIdentityProps = Pick<StudioController, 'language' | 'setLanguage' | 't'> & {
  className?: string
}

export function StudioIdentity({ className = '' }: StudioIdentityProps) {
  return (
    <div className={`studio-identity ${className}`.trim()}>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <span>Avatar Lab</span>
      </div>
    </div>
  )
}
