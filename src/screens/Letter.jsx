import { useState } from 'react'

import Button from '../components/Button.jsx'
import Room from '../components/Screen.jsx'
import { call, track } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'
import { notify } from '../lib/telegram.js'

const CONFIRM =
  'the letter has been folded and kept.\n\nit will never reach them.\nbut it exists now — and that is something.'

// The Letter Writing Desk — a letter you'll never send
export default function Letter({ onBack }) {
  const d = DOOR.letter
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      await call('letter', { text: text.trim() })
      track('folded an unsent letter')
      setSent(true)
      notify('success')
    } catch {
      /* keep their words */
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <blockquote className="revelation revelation-animate">{CONFIRM}</blockquote>
      </Room>
    )
  }

  return (
    <Room glyph={d.glyph} title={d.title} onBack={onBack}>
      <p className="whisper text-center" style={{ marginBottom: '1.5rem' }}>
        write a letter to someone
        <br />
        you will never send it to.
      </p>
      <textarea
        className="stone-input stone-textarea stone-textarea-tall"
        value={text}
        maxLength={4000}
        rows={8}
        placeholder="take your time..."
        onChange={(e) => setText(e.target.value)}
      />
      <div className="actions-row">
        <Button onClick={send} loading={loading} disabled={!text.trim()}>
          fold it away
        </Button>
      </div>
    </Room>
  )
}
