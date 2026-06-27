import { memo } from 'react'
import '../styles.css'

// The living atmosphere of the castle — a persistent ambient layer that
// exists behind everything. It never resets on navigation. It breathes.
const Atmosphere = memo(function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      {/* The castle's void — deep gradient stone walls */}
      <div className="castle-void" />
      
      {/* Stone texture — subtle masonry */}
      <div className="stone-texture" />

      {/* Fog layers — the castle breathes through its stones */}
      <div className="fog-layer fog-1" />
      <div className="fog-layer fog-2" />
      <div className="fog-layer fog-3" />

      {/* Ember particles — sparks rising from the castle depths */}
      <div className="particles">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className={`particle p-${i + 1}`} />
        ))}
      </div>

      {/* Candlelight — the castle's flickering warmth */}
      <div className="candlelight">
        <div className="candle-glow candle-glow-1" />
        <div className="candle-glow candle-glow-2" />
      </div>

      {/* The castle's ember pulse — its heartbeat */}
      <div className="ember-pulse" />
      <div className="ember-secondary" />

      {/* Vignette — darkness presses in from the edges */}
      <div className="vignette" />
    </div>
  )
})

export default Atmosphere
