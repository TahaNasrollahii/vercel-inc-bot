import { useEffect, useState } from 'react'

import Button from '../components/Button.jsx'
import Room from '../components/Screen.jsx'
import { call, track } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'
import { notify } from '../lib/telegram.js'

// The Name Chamber — choose a name for yourself in the dark
export default function Alias({ onBack }) {
  const d = DOOR.alias
  const [alias, setAlias] = useState('')
  const [saved, setSaved] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    call('alias_get')
      .then((r) => setAlias(r.alias || ''))
      .catch(() => {})
  }, [])

  async function save() {
    if (!alias.trim() || loading) return
    setLoading(true)
    try {
      const r = await call('alias_set', { alias: alias.trim() })
      track('took a new alias')
      setSaved(r.alias)
      notify('success')
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  return (
    <Room glyph={d.glyph} title={d.title} onBack={onBack}>
      <p className="whisper text-center" style={{ marginBottom: '1.5rem' }}>
        choose a name for yourself.
        <br />
        something dark. something true.
      </p>
      <input
        className="stone-input"
        dir="auto"
        value={alias}
        maxLength={32}
        placeholder="the name you choose..."
        onChange={(e) => {
          setAlias(e.target.value)
          setSaved(null)
        }}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <p className="stone-hint" style={{ marginBottom: 0 }}>
        only the keeper will see it.
      </p>
      <div className="actions-row">
        <Button onClick={save} loading={loading} disabled={!alias.trim()}>
          take the name
        </Button>
      </div>

      {saved && (
        <p className="revelation revelation-animate text-center" style={{ marginTop: '1.75rem' }}>
          from now on, you arrive as
          <br />
          <span className="alias-display fa" dir="auto">{saved}</span>
        </p>
      )}
    </Room>
  )
}
