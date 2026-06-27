import { useEffect, useState } from 'react'

import Button from '../components/Button.jsx'
import Room from '../components/Screen.jsx'
import { call, track } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'
import { notify } from '../lib/telegram.js'

const SAVED =
  'the vow is sealed.\n\nit sleeps in the dark, cold and deep.\nwhen the days run out, the castle returns —\nto wake the promise you were meant to keep.'

// The Vow Sanctum — swear what the dark will keep
export default function Vow({ onBack }) {
  const d = DOOR.vow
  const [state, setState] = useState('loading') // loading | view | form | saved
  const [vow, setVow] = useState(null)
  const [text, setText] = useState('')
  const [days, setDays] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    call('vow_get')
      .then((r) => {
        if (r.vow) {
          setVow(r.vow)
          setState('view')
        } else {
          setState('form')
        }
      })
      .catch(() => setState('form'))
  }, [])

  const daysNum = parseInt(days, 10)
  const validDays = daysNum >= 1 && daysNum <= 365

  async function save() {
    if (!text.trim() || !validDays || loading) return
    setLoading(true)
    try {
      await call('vow_set', { text: text.trim(), days: daysNum })
      track('sealed a vow')
      setState('saved')
      notify('success')
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  if (state === 'loading') {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <div className="castle-loading">
          <span className="loading-sigil">🩸</span>
          <p className="loading-whisper">the dark recalls...</p>
        </div>
      </Room>
    )
  }

  if (state === 'saved') {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <blockquote className="revelation revelation-animate">{SAVED}</blockquote>
      </Room>
    )
  }

  if (state === 'view') {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <p className="revelation-label">a vow already burns</p>
        <blockquote className="revelation revelation-animate">{vow.text}</blockquote>
        <p className="whisper text-center" style={{ marginTop: '1.25rem', fontSize: '1rem' }}>
          ⏳ {vow.days_left} {vow.days_left === 1 ? 'day' : 'days'} remain before the dark returns for it.
        </p>
        <div className="actions-row">
          <Button variant="ghost" onClick={() => setState('form')}>
            swear anew
          </Button>
        </div>
      </Room>
    )
  }

  // form
  return (
    <Room glyph={d.glyph} title={d.title} onBack={onBack}>
      <p className="whisper text-center" style={{ marginBottom: '1.5rem' }}>
        make a vow to yourself —
        <br />
        something you swear to do, or to become.
      </p>
      <textarea
        className="stone-input stone-textarea"
        value={text}
        maxLength={2000}
        rows={4}
        placeholder="i swear that..."
        onChange={(e) => setText(e.target.value)}
      />
      <label className="stone-hint" htmlFor="vow-days">
        how many days until the dark reminds you? (1–365)
      </label>
      <input
        id="vow-days"
        className="stone-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={365}
        value={days}
        placeholder="e.g. 30"
        onChange={(e) => setDays(e.target.value)}
      />
      <div className="actions-row">
        <Button onClick={save} loading={loading} disabled={!text.trim() || !validDays}>
          seal the vow
        </Button>
      </div>
    </Room>
  )
}
