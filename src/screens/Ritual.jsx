import { useEffect, useState } from 'react'

import Button from '../components/Button.jsx'
import Room from '../components/Screen.jsx'
import { call, track } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'
import { notify } from '../lib/telegram.js'

const NUMERALS = ['I', 'II', 'III', 'IV']
const CONFIRM =
  'the ritual is complete.\n\nwhat you gave has been received and kept.\nthe castle holds it in the dark —\na secret that has never wept.'

// The Ritual Chamber — a four-question initiation
export default function Ritual({ onBack }) {
  const d = DOOR.ritual
  const [questions, setQuestions] = useState(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([])
  const [current, setCurrent] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    call('ritual_questions')
      .then((r) => setQuestions(r.questions))
      .catch(() => setQuestions([]))
  }, [])

  async function advance() {
    if (loading) return
    const filled = [...answers, current.trim() || '[no answer]']
    setCurrent('')

    if (filled.length < 4) {
      setAnswers(filled)
      setStep(step + 1)
      return
    }

    setLoading(true)
    try {
      await call('ritual', { answers: filled })
      track('completed the ritual')
      setDone(true)
      notify('success')
    } catch {
      setAnswers(filled)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <blockquote className="revelation revelation-animate">{CONFIRM}</blockquote>
      </Room>
    )
  }

  if (!questions) {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <div className="castle-loading">
          <span className="loading-sigil">🕯️</span>
          <p className="loading-whisper">the rite gathers...</p>
        </div>
      </Room>
    )
  }

  const last = step === 3
  return (
    <Room
      glyph={d.glyph}
      title={d.title}
      subtitle="four questions. answer honestly."
      onBack={onBack}
    >
      <div className="ritual-marks">
        {NUMERALS.map((n, i) => (
          <span
            key={n}
            className={`ritual-mark${i === step ? ' active' : ''}${i < step ? ' past' : ''}`}
          >
            {n}
          </span>
        ))}
      </div>

      <p className="whisper text-center" key={step} style={{ marginBottom: '1.5rem' }}>
        {questions[step]}
      </p>

      <textarea
        className="stone-input stone-textarea"
        value={current}
        maxLength={2000}
        rows={4}
        placeholder="speak..."
        onChange={(e) => setCurrent(e.target.value)}
      />

      <div className="actions-row">
        <Button onClick={advance} loading={loading}>
          {last ? 'complete the rite' : 'continue'}
        </Button>
      </div>
    </Room>
  )
}
