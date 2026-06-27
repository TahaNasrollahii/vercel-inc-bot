import { isDev } from '../lib/telegram.js'

// A room in the castle. Every screen is wrapped in this — it provides
// the room's header (sigil, name, whisper) and the threshold to return.
export default function Room({ glyph, title, subtitle, children, onBack }) {
  return (
    <div className="room-interior">
      <header className="room-header">
        {isDev && onBack && (
          <button
            type="button"
            className="threshold"
            onClick={onBack}
            aria-label="return to the corridor"
          >
            ←
          </button>
        )}
        {glyph && <div className="room-sigil">{glyph}</div>}
        <h1 className="room-name">{title}</h1>
        {subtitle && <p className="room-whisper">{subtitle}</p>}
      </header>
      <div className="room-body">{children}</div>
    </div>
  )
}
