import { useCallback, useEffect, useState } from 'react'

import Placeholder from './components/Placeholder.jsx'
import { call, track } from './lib/api.js'
import { DOOR } from './lib/doors.js'
import { SCREENS } from './lib/screens.jsx'
import { isDev, setBackButton } from './lib/telegram.js'
import Home from './screens/Home.jsx'
import Atmosphere from './components/Atmosphere.jsx'

// The Castle Shell — drives navigation as room transitions.
// Every screen is a room. Moving between them is walking through the castle.
export default function App() {
  const [me, setMe] = useState(null)
  const [boot, setBoot] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [stack, setStack] = useState(['home'])
  const [prevRoom, setPrevRoom] = useState(null)
  const [transitioning, setTransitioning] = useState(false)

  const navigate = useCallback((key) => {
    track(`entered ${DOOR[key]?.title || key}`)
    setStack((s) => {
      setPrevRoom(s[s.length - 1])
      setTransitioning(true)
      return [...s, key]
    })
  }, [])

  const back = useCallback(
    () => setStack((s) => {
      if (s.length > 1) {
        setPrevRoom(s[s.length - 1])
        setTransitioning(true)
        return s.slice(0, -1)
      }
      return s
    }),
    [],
  )

  // Clear the transition state after the animation completes
  useEffect(() => {
    if (transitioning) {
      const timer = setTimeout(() => {
        setPrevRoom(null)
        setTransitioning(false)
      }, 650)
      return () => clearTimeout(timer)
    }
  }, [transitioning])

  // Authenticate the soul entering the castle
  useEffect(() => {
    call('me')
      .then((data) => {
        setMe(data)
        setBoot('ready')
      })
      .catch((err) => {
        setError(err.message)
        setBoot('error')
      })
  }, [])

  const current = stack[stack.length - 1]

  // Telegram native back button
  useEffect(() => {
    setBackButton(stack.length > 1, back)
  }, [stack.length, back])

  // Clear inbox badge when entering the whispering chamber
  useEffect(() => {
    if (current === 'inbox') {
      setMe((m) => (m && m.unread ? { ...m, unread: 0 } : m))
    }
  }, [current])

  // Poll for unread whispers
  useEffect(() => {
    if (boot !== 'ready') return undefined
    let alive = true
    const poll = async () => {
      try {
        const r = await call('unread')
        if (alive && typeof r.unread === 'number') {
          setMe((m) => (m ? { ...m, unread: r.unread } : m))
        }
      } catch {
        /* the dark is patient */
      }
    }
    const id = setInterval(poll, 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [boot])

  // Boot states — the castle awakens
  if (boot === 'loading') return <CastleBoot>the dark stirs...</CastleBoot>
  if (boot === 'error') {
    return (
      <CastleBoot error>
        the gate would not open.
        <br />
        <span className="boot-reason">{error}</span>
      </CastleBoot>
    )
  }

  function renderRoom(key) {
    if (key === 'home') return <Home me={me} navigate={navigate} />
    const Comp = SCREENS[key]
    return Comp ? (
      <Comp me={me} navigate={navigate} onBack={back} />
    ) : (
      <Placeholder screenKey={key} onBack={back} />
    )
  }

  const currentRoom = renderRoom(current)
  const exitingRoom = prevRoom ? renderRoom(prevRoom) : null

  return (
    <main className="castle">
      <Atmosphere />
      <div className="room-viewport">
        {exitingRoom && (
          <div key={prevRoom + '-exit'} className="room room-exit" aria-hidden="true">
            {exitingRoom}
          </div>
        )}
        <div key={current} className="room room-enter">
          {currentRoom}
        </div>
      </div>
      {isDev && <p className="dev-indicator">dev preview — outside telegram</p>}
    </main>
  )
}

// The castle boot screen — the castle awakens from slumber
function CastleBoot({ children, error }) {
  return (
    <main className="castle-boot">
      <Atmosphere />
      <div className="great-candle" aria-hidden="true">🕯️</div>
      <h1 className="boot-title">the castle</h1>
      <p className={`boot-whisper${error ? ' error' : ''}`}>{children}</p>
    </main>
  )
}
