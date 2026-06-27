import { useEffect, useState } from 'react'

import Room from '../components/Screen.jsx'
import Thread from '../components/Thread.jsx'
import { call } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'

// The Whispering Chamber's Echo — answers from the dark
export default function Inbox({ onBack }) {
  const d = DOOR.inbox
  const [state, setState] = useState('loading')
  const [messages, setMessages] = useState([])

  useEffect(() => {
    call('inbox')
      .then((r) => {
        setMessages(r.messages || [])
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  return (
    <Room glyph={d.glyph} title={d.title} onBack={onBack}>
      {state === 'loading' && (
        <div className="castle-loading">
          <span className="loading-sigil">👁️</span>
          <p className="loading-whisper">listening to the dark...</p>
        </div>
      )}

      {state === 'error' && (
        <p className="whisper text-center" style={{ color: '#cf8275' }}>
          the dark would not answer.
        </p>
      )}

      {state === 'ready' && messages.length === 0 && (
        <p className="castle-empty">
          {'nothing has returned yet.\nwhat you send will live here —\nand so will every answer.'}
        </p>
      )}

      {state === 'ready' && messages.length > 0 && (
        <Thread messages={messages} perspective="soul" />
      )}
    </Room>
  )
}
