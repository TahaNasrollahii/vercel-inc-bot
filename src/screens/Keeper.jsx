import { useEffect, useRef, useState } from 'react'

import Button from '../components/Button.jsx'
import Room from '../components/Screen.jsx'
import Thread, { formatTime } from '../components/Thread.jsx'
import { call } from '../lib/api.js'
import { DOOR } from '../lib/doors.js'
import { toBase64, tooBig } from '../lib/media.js'
import { haptic, notify, setBackButton } from '../lib/telegram.js'

// The Watchtower — the keeper's console. Every soul's conversation in one place.

const PREVIEW_GLYPH = {
  photo: '📷',
  video: '🎬',
  voice: '🎤',
  audio: '🎵',
  animation: '🎞️',
  sticker: '🌒',
  document: '📄',
}

function who(t) {
  const name = (t.name || '').trim()
  const username = t.username ? `@${t.username}` : ''
  const parts = []
  if (username) parts.push(username)
  if (name) parts.push(name)
  parts.push(`${t.uid}`)
  return parts.join(' - ')
}

function shortName(t) {
  if (t.name) return t.name.trim()
  if (t.username) return `@${t.username}`
  return `${t.uid}`
}

function preview(t) {
  if (t.last_media) return `${PREVIEW_GLYPH[t.last_media] || '📎'} ${t.last_media}`
  const text = (t.last_text || '').trim()
  if (!text) return '—'
  return t.last_dir === 'in' ? `you: ${text}` : text
}

export default function Keeper({ me, onBack }) {
  const d = DOOR.keeper
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setBackButton(true, selected ? () => setSelected(null) : onBack)
  }, [selected, onBack])

  const back = selected ? () => setSelected(null) : onBack

  if (!me?.is_admin) {
    return (
      <Room glyph={d.glyph} title={d.title} onBack={onBack}>
        <p className="whisper text-center" style={{ color: '#cf8275' }}>
          this sight is not yours.
        </p>
      </Room>
    )
  }

  if (selected) {
    return <Chat thread={selected} onBack={back} />
  }
  return <ChatList onOpen={setSelected} onBack={onBack} />
}

function ChatList({ onOpen, onBack }) {
  const d = DOOR.keeper
  const [state, setState] = useState('loading')
  const [threads, setThreads] = useState([])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const r = await call('admin_threads')
        if (alive) {
          setThreads(r.threads || [])
          setState('ready')
        }
      } catch {
        if (alive) setState((s) => (s === 'loading' ? 'error' : s))
      }
    }
    run()
    const id = setInterval(run, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  return (
    <Room glyph={d.glyph} title={d.title} subtitle="every voice in the castle" onBack={onBack}>
      {state === 'loading' && (
        <div className="castle-loading">
          <span className="loading-sigil">👁️🗨️</span>
          <p className="loading-whisper">gathering the voices...</p>
        </div>
      )}
      {state === 'error' && (
        <p className="whisper text-center" style={{ color: '#cf8275' }}>
          the dark would not answer.
        </p>
      )}

      {state === 'ready' && threads.length === 0 && (
        <p className="castle-empty">{'no one has spoken yet.\nthe castle is silent.'}</p>
      )}

      {state === 'ready' && threads.length > 0 && (
        <div className="watchtower-list">
          {threads.map((t) => (
            <button
              key={t.uid}
              className={`watchtower-row${t.new ? ' unanswered' : ''}`}
              onClick={() => {
                haptic('light')
                onOpen(t)
              }}
            >
              <span className="watchtower-row-main">
                <span className="watchtower-row-name">
                  {who(t)}
                  {t.new && <span className="watchtower-dot" aria-label="unanswered" />}
                </span>
                <span className="watchtower-row-preview">{preview(t)}</span>
              </span>
              <span className="watchtower-row-time">{formatTime(t.ts)}</span>
            </button>
          ))}
        </div>
      )}
    </Room>
  )
}

function Chat({ thread, onBack }) {
  const d = DOOR.keeper
  const uid = thread.uid
  const [state, setState] = useState('loading')
  const [messages, setMessages] = useState([])

  async function load() {
    try {
      const r = await call('admin_thread', { uid })
      setMessages(r.messages || [])
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useEffect(() => {
    load()
  }, [uid])

  return (
    <Room glyph={d.glyph} title={who(thread)} subtitle={`#${uid}`} onBack={onBack}>
      {state === 'loading' && (
        <div className="castle-loading">
          <span className="loading-sigil">👁️</span>
          <p className="loading-whisper">opening the thread...</p>
        </div>
      )}
      {state === 'error' && (
        <p className="whisper text-center" style={{ color: '#cf8275' }}>
          the dark would not answer.
        </p>
      )}

      {state === 'ready' && (
        <>
          {messages.length === 0 ? (
            <p className="castle-empty">{'nothing yet between you.'}</p>
          ) : (
            <Thread messages={messages} perspective="keeper" theirLabel={shortName(thread)} />
          )}
          <Composer uid={uid} onSent={load} />
        </>
      )}
    </Room>
  )
}

function Composer({ uid, onSent }) {
  const [text, setText] = useState('')
  const [media, setMedia] = useState(null)
  const [mediaError, setMediaError] = useState('')
  const [attaching, setAttaching] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sending, setSending] = useState(false)

  const photoInput = useRef(null)
  const videoInput = useRef(null)
  const recorder = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)

  useEffect(() => {
    return () => {
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl)
      if (timer.current) clearInterval(timer.current)
      if (recorder.current && recorder.current.state !== 'inactive') {
        recorder.current.stop()
        recorder.current.stream?.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  function clearMedia() {
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl)
    setMedia(null)
    setMediaError('')
  }

  async function attach(file, kind) {
    if (!file) return
    setMediaError('')
    if (tooBig(file.size)) {
      setMediaError('too heavy for the castle — keep it under 3 MB.')
      return
    }
    setAttaching(true)
    try {
      const data = await toBase64(file)
      clearMedia()
      setMedia({
        kind,
        data,
        mime: file.type,
        filename: file.name || `${kind}`,
        previewUrl: URL.createObjectURL(file),
      })
      haptic('light')
    } catch {
      setMediaError('that file could not be read.')
    } finally {
      setAttaching(false)
    }
  }

  async function toggleRecord() {
    if (recording) {
      recorder.current?.stop()
      return
    }
    setMediaError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : undefined
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(timer.current)
        setRecording(false)
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
        if (tooBig(blob.size)) {
          setMediaError('that recording is too long — keep it under 3 MB.')
          return
        }
        setAttaching(true)
        const data = await toBase64(blob)
        setAttaching(false)
        const ext = (rec.mimeType || '').includes('ogg') ? 'ogg' : 'webm'
        clearMedia()
        setMedia({
          kind: 'voice',
          data,
          mime: rec.mimeType || 'audio/webm',
          filename: `voice.${ext}`,
          previewUrl: URL.createObjectURL(blob),
        })
        notify('success')
      }
      recorder.current = rec
      rec.start()
      setRecording(true)
      setSeconds(0)
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      haptic('medium')
    } catch {
      setMediaError('the castle could not reach your microphone.')
    }
  }

  async function send() {
    if ((!text.trim() && !media) || sending || recording) return
    setSending(true)
    try {
      const payload = { uid, text: text.trim() }
      if (media) {
        payload.media = {
          kind: media.kind,
          data: media.data,
          mime: media.mime,
          filename: media.filename,
        }
      }
      await call('admin_reply', payload)
      setText('')
      clearMedia()
      notify('success')
      onSent?.()
    } catch {
      /* keep their words so they can retry */
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="composer-area">
      <textarea
        className="stone-input stone-textarea"
        value={text}
        maxLength={4000}
        rows={3}
        placeholder="answer from the dark..."
        onChange={(e) => setText(e.target.value)}
      />

      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => attach(e.target.files?.[0], 'photo')}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => attach(e.target.files?.[0], 'video')}
      />

      {!media && !attaching && (
        <div className="attach-bar">
          <button type="button" className="attach-stone" onClick={() => photoInput.current?.click()}>
            📷 photo
          </button>
          <button type="button" className="attach-stone" onClick={() => videoInput.current?.click()}>
            🎬 video
          </button>
          <button
            type="button"
            className={`attach-stone${recording ? ' recording' : ''}`}
            onClick={toggleRecord}
          >
            {recording ? `⏺ ${seconds}s · stop` : '🎤 voice'}
          </button>
        </div>
      )}

      {attaching && (
        <p className="attach-loading">
          <span className="arcane-spinner" aria-hidden="true" /> drawing it into the dark...
        </p>
      )}

      {media && (
        <div className="media-preview-chip revelation-animate">
          <MediaPreview media={media} />
          <span className="media-preview-label">{media.kind}</span>
          <button type="button" className="media-preview-remove" onClick={clearMedia} aria-label="remove">
            ×
          </button>
        </div>
      )}

      {mediaError && (
        <p className="whisper text-center mt-small" style={{ color: '#cf8275' }}>{mediaError}</p>
      )}

      <div className="actions-row">
        <Button
          onClick={send}
          loading={sending}
          loadingText="carrying it through..."
          disabled={(!text.trim() && !media) || recording || attaching}
        >
          send into the dark
        </Button>
      </div>
    </div>
  )
}

function MediaPreview({ media }) {
  if (media.kind === 'photo') {
    return <img className="media-preview-thumb" src={media.previewUrl} alt="" />
  }
  if (media.kind === 'video') {
    return <video className="media-preview-thumb" src={media.previewUrl} muted playsInline />
  }
  return <audio className="media-preview-audio" src={media.previewUrl} controls />
}
