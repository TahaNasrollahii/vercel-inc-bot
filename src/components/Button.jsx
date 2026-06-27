import { haptic } from '../lib/telegram.js'

// A carved stone button — feels like pressing into ancient masonry.
// Variants: 'ember' (burning), 'ghost' (ethereal), default (stone).
export default function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText,
  variant = 'ember',
}) {
  const variantClass = variant === 'ember' ? ' stone-btn-ember'
    : variant === 'ghost' ? ' stone-btn-ghost'
    : ''

  return (
    <button
      type="button"
      className={`stone-btn${variantClass}${loading ? ' stone-btn-loading' : ''}`}
      disabled={disabled || loading}
      onClick={(e) => {
        haptic('medium')
        onClick?.(e)
      }}
    >
      {loading ? (
        <span className="stone-btn-loading-text">
          <span className="arcane-spinner" aria-hidden="true" />
          {loadingText || 'one moment...'}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
