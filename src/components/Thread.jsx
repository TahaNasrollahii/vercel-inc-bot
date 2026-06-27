// The back-and-forth whisper list, shared by the soul's inbox and the keeper's
// console. `perspective` decides whose messages sit on the right.

const MEDIA_LABELS = {
  photo: { glyph: '📷', label: 'a photo' },
  video: { glyph: '🎬', label: 'a video' },
  voice: { glyph: '🎤', label: 'a voice message' },
  audio: { glyph: '🎵', label: 'an audio clip' },
  animation: { glyph: '🎞️', label: 'a gif' },
  sticker: { glyph: '🌒', label: 'a sticker' },
  document: { glyph: '📄', label: 'a file' },
  media: { glyph: '📎', label: 'an attachment' },
}

const BARE = /^\[(media|photo|video|voice|audio|document|gif|sticker|animation)\]$/i

function resolveKind(m) {
  if (m.media) return m.media in MEDIA_LABELS ? m.media : 'media'
  const match = BARE.exec((m.text || '').trim())
  if (!match) return null
  const k = match[1].toLowerCase()
  if (k === 'gif') return 'animation'
  return k in MEDIA_LABELS ? k : 'media'
}

function captionOf(m, kind) {
  const t = (m.text || '').trim()
  if (kind && BARE.test(t)) return ''
  return t
}

export function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function Thread({ messages, perspective = 'soul', theirLabel }) {
  const theirs = perspective === 'keeper' ? theirLabel || 'the soul' : 'the dark'

  return (
    <div className="thread">
      {messages.map((m, i) => {
        const kind = resolveKind(m)
        const caption = captionOf(m, kind)
        const media = kind ? MEDIA_LABELS[kind] : null
        const mine = perspective === 'keeper' ? m.dir === 'in' : m.dir === 'out'
        return (
          <div
            key={i}
            className={`whisper-bubble ${mine ? 'whisper-out' : 'whisper-in'}`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            {media && (
              <div className="bubble-media-card">
                <span className="bubble-media-glyph">{media.glyph}</span>
                <span className="bubble-media-label">
                  {media.label}
                  {!mine && <span className="bubble-media-hint">opened in your chat ↗</span>}
                </span>
              </div>
            )}
            {caption && <p className="whisper-text">{caption}</p>}
            <span className="whisper-meta">
              {mine ? 'you' : theirs} · {formatTime(m.ts)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
