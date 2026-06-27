import Room from './Screen.jsx'
import { DOOR } from '../lib/doors.js'

// A room not yet carved from the stone — placeholder for unbuilt screens.
export default function Placeholder({ screenKey, onBack }) {
  const door = DOOR[screenKey] || { glyph: '🕯️', title: 'a door', sub: '' }
  return (
    <Room glyph={door.glyph} title={door.title} subtitle={door.sub} onBack={onBack}>
      <div className="castle-loading">
        <span className="loading-sigil">🕯️</span>
        <p className="loading-whisper">
          this room is still being carved
          <br />
          from the dark.
        </p>
      </div>
    </Room>
  )
}
