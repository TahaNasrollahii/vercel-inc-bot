import { useState } from 'react'

import Button from '../components/Button.jsx'
import Room from '../components/Screen.jsx'
import { call, track } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'
import { notify } from '../lib/telegram.js'

// The Void Chamber — draw a whisper from the darkness
export default function Dark({ onBack }) {
  const d = DOOR.dark
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)

  async function draw() {
    setLoading(true)
    try {
      const r = await call('dark')
      setQuote(r.quote)
      track('drew a dark quote')
      notify('success')
    } catch {
      /* the void stayed silent */
    } finally {
      setLoading(false)
    }
  }

  return (
    <Room glyph={d.glyph} title={d.title} subtitle={d.sub} onBack={onBack}>
      {quote && <blockquote className="revelation revelation-animate">{quote}</blockquote>}
      <div className="actions-row">
        <Button onClick={draw} loading={loading}>
          {quote ? 'draw again' : 'draw from the void'}
        </Button>
      </div>
    </Room>
  )
}
