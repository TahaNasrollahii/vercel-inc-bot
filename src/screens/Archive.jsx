import { useEffect, useState } from 'react'

import Room from '../components/Screen.jsx'
import { call } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'

// The Reliquary — what the dark remembers of you
export default function Archive({ onBack }) {
  const d = DOOR.archive
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)

  useEffect(() => {
    call('archive')
      .then((r) => {
        setData(r)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  if (state === 'loading') {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <div className="castle-loading">
          <span className="loading-sigil">📖</span>
          <p className="loading-whisper">the dark remembers...</p>
        </div>
      </Room>
    )
  }

  if (state === 'error') {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <p className="whisper text-center" style={{ color: '#cf8275' }}>
          the archive would not open.
        </p>
      </Room>
    )
  }

  const { alias, stats, vow } = data

  return (
    <Room glyph={d.glyph} title={d.title} subtitle="what the dark remembers of you" onBack={onBack}>
      <div className="reliquary">
        <Relic glyph="🪦" label="known as" value={alias || 'no one'} fa={!!alias} />
        <Relic glyph="📩" label="words carried" value={stats.messages} />
        <Relic glyph="🕯️" label="rituals completed" value={stats.rituals} />
        <Relic glyph="📜" label="letters left unsent" value={stats.letters} />
        <Relic
          glyph="🚪"
          label="first crossed the threshold"
          value={stats.first_seen || 'lost to the dark'}
        />
      </div>

      <div className="vow-inscription">
        {vow ? (
          <>
            <p className="revelation-label" style={{ margin: '0 0 0.75rem' }}>
              🩸 a vow burns
            </p>
            <blockquote className="revelation" style={{ margin: 0, fontSize: '1.2rem' }}>
              {vow.text}
            </blockquote>
            <p className="text-muted text-center" style={{ marginTop: '0.75rem' }}>
              ⏳ {vow.days_left} {vow.days_left === 1 ? 'day' : 'days'} until the dark returns for it
            </p>
          </>
        ) : (
          <p className="text-muted text-center" style={{ margin: 0 }}>
            🩸 no vow burns in the dark
          </p>
        )}
      </div>

      <p className="archive-footnote">
        nothing here has a name.
        <br />
        only what you chose to leave behind.
      </p>
    </Room>
  )
}

function Relic({ glyph, label, value, fa }) {
  return (
    <div className="reliquary-item">
      <span className="reliquary-glyph">{glyph}</span>
      <span className="reliquary-label">{label}</span>
      <span className={`reliquary-value${fa ? ' fa' : ''}`} dir="auto">
        {value}
      </span>
    </div>
  )
}
