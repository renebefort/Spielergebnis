import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEYS = {
  homePlayers: 'sg_homePlayers',
  guestPlayers: 'sg_guestPlayers',
  maxScorers: 'sg_maxScorers',
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function buildMarkdown(homePlayers, guestPlayers, totalHome, totalGuest, homeMulti, guestMulti, homeScorersCount, guestScorersCount, maxScorers) {
  const lines = []

  lines.push('# Spielergebnis')
  lines.push('')
  lines.push(`Heim **${totalHome}** : **${totalGuest}** Gast`)
  lines.push('')
  lines.push('## Torschützen')
  lines.push('')

  const formatList = (players) => {
    const scorers = players.filter((p) => p.goals > 0)
    if (scorers.length === 0) return ['_(keine Tore)_']
    return scorers.map((p) => {
      const label = p.name
        ? `#${String(p.num).padStart(2, '0')} ${p.name}`
        : `#${String(p.num).padStart(2, '0')}`
      return `- ${label}: ${p.goals} ${p.goals === 1 ? 'Tor' : 'Tore'}`
    })
  }

  lines.push('### Heim')
  lines.push(...formatList(homePlayers))
  lines.push('')
  lines.push('### Gast')
  lines.push(...formatList(guestPlayers))
  lines.push('')
  lines.push('## Handball')
  lines.push('')
  lines.push(`Multiplikator: ${maxScorers}`)
  lines.push('')
  lines.push(`Heim **${homeMulti}** : **${guestMulti}** Gast`)
  lines.push(
    `_(${totalHome} × ${homeScorersCount} = ${homeMulti} | ${totalGuest} × ${guestScorersCount} = ${guestMulti})_`
  )

  return lines.join('\n')
}

export default function App() {
  const [homePlayers, setHomePlayers] = useState(() =>
    loadFromStorage(STORAGE_KEYS.homePlayers, [])
  )
  const [guestPlayers, setGuestPlayers] = useState(() =>
    loadFromStorage(STORAGE_KEYS.guestPlayers, [])
  )
  const [maxScorers, setMaxScorers] = useState(() =>
    Math.max(1, loadFromStorage(STORAGE_KEYS.maxScorers, 1))
  )
  const [maxScorersRaw, setMaxScorersRaw] = useState(() =>
    String(Math.max(1, loadFromStorage(STORAGE_KEYS.maxScorers, 1)))
  )

  const [copyStatus, setCopyStatus] = useState('idle')
  const [resetStep, setResetStep] = useState(0)
  const resetTimerRef = useRef(null)
  const [showHelp, setShowHelp] = useState(false)

  // Add-player input state
  const [homeNumRaw, setHomeNumRaw] = useState('')
  const [homeName, setHomeName] = useState('')
  const [homeNumError, setHomeNumError] = useState(false)
  const [guestNumRaw, setGuestNumRaw] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestNumError, setGuestNumError] = useState(false)

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.homePlayers, JSON.stringify(homePlayers))
  }, [homePlayers])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.guestPlayers, JSON.stringify(guestPlayers))
  }, [guestPlayers])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.maxScorers, JSON.stringify(maxScorers))
  }, [maxScorers])

  // Clean up old localStorage keys
  useEffect(() => {
    localStorage.removeItem('sg_playerCount')
    localStorage.removeItem('sg_homeGoals')
    localStorage.removeItem('sg_guestGoals')
  }, [])

  const sortedHome = [...homePlayers].sort((a, b) => a.num - b.num)
  const sortedGuest = [...guestPlayers].sort((a, b) => a.num - b.num)

  const totalHome = homePlayers.reduce((s, p) => s + p.goals, 0)
  const totalGuest = guestPlayers.reduce((s, p) => s + p.goals, 0)

  const homeScorersCount = Math.min(
    homePlayers.filter((p) => p.goals > 0).length,
    maxScorers
  )
  const guestScorersCount = Math.min(
    guestPlayers.filter((p) => p.goals > 0).length,
    maxScorers
  )
  const homeMulti = totalHome * homeScorersCount
  const guestMulti = totalGuest * guestScorersCount

  const addPlayer = useCallback((team, num, name) => {
    const setter = team === 'home' ? setHomePlayers : setGuestPlayers
    const players = team === 'home' ? homePlayers : guestPlayers
    if (players.some((p) => p.num === num)) return false
    setter((prev) => [...prev, { num, name: name.trim(), goals: 0 }])
    return true
  }, [homePlayers, guestPlayers])

  const changeGoal = useCallback((team, num, delta) => {
    const setter = team === 'home' ? setHomePlayers : setGuestPlayers
    setter((prev) =>
      prev.map((p) =>
        p.num === num ? { ...p, goals: Math.max(0, p.goals + delta) } : p
      )
    )
  }, [])

  const handleAddHome = (e) => {
    e.preventDefault()
    const num = parseInt(homeNumRaw, 10)
    if (isNaN(num) || num < 1) {
      setHomeNumError(true)
      setTimeout(() => setHomeNumError(false), 600)
      return
    }
    if (!addPlayer('home', num, homeName)) {
      setHomeNumError(true)
      setTimeout(() => setHomeNumError(false), 600)
      return
    }
    setHomeNumRaw('')
    setHomeName('')
  }

  const handleAddGuest = (e) => {
    e.preventDefault()
    const num = parseInt(guestNumRaw, 10)
    if (isNaN(num) || num < 1) {
      setGuestNumError(true)
      setTimeout(() => setGuestNumError(false), 600)
      return
    }
    if (!addPlayer('guest', num, guestName)) {
      setGuestNumError(true)
      setTimeout(() => setGuestNumError(false), 600)
      return
    }
    setGuestNumRaw('')
    setGuestName('')
  }

  const handleMaxScorersChange = (e) => {
    setMaxScorersRaw(e.target.value)
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val >= 1) setMaxScorers(val)
  }

  const handleMaxScorersBlur = () => {
    const val = parseInt(maxScorersRaw, 10)
    const clamped = isNaN(val) || val < 1 ? 1 : val
    setMaxScorers(clamped)
    setMaxScorersRaw(String(clamped))
  }

  const handleCopy = useCallback(() => {
    const md = buildMarkdown(
      homePlayers, guestPlayers,
      totalHome, totalGuest,
      homeMulti, guestMulti,
      homeScorersCount, guestScorersCount,
      maxScorers
    )
    navigator.clipboard.writeText(md).then(() => {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    })
  }, [homePlayers, guestPlayers, totalHome, totalGuest, homeMulti, guestMulti, homeScorersCount, guestScorersCount, maxScorers])

  const handleResetClick = () => {
    if (resetStep === 0) {
      setResetStep(1)
      resetTimerRef.current = setTimeout(() => setResetStep(0), 3000)
    } else {
      clearTimeout(resetTimerRef.current)
      setResetStep(0)
      setHomePlayers([])
      setGuestPlayers([])
      setMaxScorers(1)
      setMaxScorersRaw('1')
    }
  }

  const renderTeamSection = (team, title, players, numRaw, setNumRaw, name, setName, numError, handleAdd) => (
    <section className={`team-section team-section-${team}`}>
      <h2 className={`team-section-title team-section-title-${team}`}>{title}</h2>

      <div className="player-list">
        {players.map((p) => (
          <div key={p.num} className="player-row">
            <div className="player-info">
              <span className="player-num">#{String(p.num).padStart(2, '0')}</span>
              {p.name && <span className="player-name">{p.name}</span>}
            </div>
            <div className="goal-cell">
              <button
                className="btn btn-minus"
                onClick={() => changeGoal(team, p.num, -1)}
                aria-label={`${title} #${p.num} Tor entfernen`}
                disabled={p.goals === 0}
              >
                −
              </button>
              <span className="goal-value">{p.goals}</span>
              <button
                className="btn btn-plus"
                onClick={() => changeGoal(team, p.num, 1)}
                aria-label={`${title} #${p.num} Tor hinzufügen`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="add-player-row" onSubmit={handleAdd}>
        <input
          type="number"
          min="1"
          className={`add-player-input add-player-num ${numError ? 'add-player-input-error' : ''}`}
          placeholder="#"
          value={numRaw}
          onChange={(e) => setNumRaw(e.target.value)}
          aria-label={`Trikonummer ${title}`}
        />
        <input
          type="text"
          className="add-player-input add-player-name"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Spielername ${title}`}
        />
        <button type="submit" className="add-player-btn" aria-label={`Spieler zu ${title} hinzufügen`}>+</button>
      </form>
    </section>
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Spielergebnis</h1>
        <button
          className="help-btn"
          onClick={() => setShowHelp(true)}
          aria-label="Anleitung anzeigen"
          title="Anleitung"
        >
          ?
        </button>
      </header>

      <main className="app-main">
        {/* Help modal */}
        {showHelp && (
          <div className="modal-overlay" onClick={() => setShowHelp(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Anleitung</h2>
                <button className="modal-close" onClick={() => setShowHelp(false)} aria-label="Schließen">✕</button>
              </div>
              <div className="modal-body">
                <p>Diese App hilft euch dabei, Sportergebnisse schnell und übersichtlich zu erfassen.</p>

                <h3>Spieler hinzufügen</h3>
                <p>In jedem Bereich (Heim/Gast) könnt ihr einzelne Spieler über die Trikonummer hinzufügen. Optional könnt ihr auch den Spielernamen eingeben. Jede Trikonummer kann pro Mannschaft nur einmal vergeben werden.</p>

                <h3>Tore erfassen</h3>
                <p>Pro Spieler könnt ihr über die Plus/Minus-Tasten die Tore eintragen.</p>

                <h3>Handball – Multiplikator</h3>
                <p>Im unteren Bereich findet ihr die spezielle Regelung für den Jugendhandball. Tragt dort die maximale Anzahl der Torschützen ein. Der Multiplikator fließt in die Berechnung des Endergebnisses ein.</p>

                <p className="modal-footer-text">Viel Spaß mit der App!</p>
              </div>
            </div>
          </div>
        )}

        {/* Scoreboard */}
        <div className="scoreboard">
          <span className="team-label">Heim</span>
          <span className="score-total">{totalHome}</span>
          <span className="score-divider">:</span>
          <span className="score-total">{totalGuest}</span>
          <span className="team-label">Gast</span>
        </div>

        {/* Team sections */}
        {renderTeamSection('home', 'Heim', sortedHome, homeNumRaw, setHomeNumRaw, homeName, setHomeName, homeNumError, handleAddHome)}
        {renderTeamSection('guest', 'Gast', sortedGuest, guestNumRaw, setGuestNumRaw, guestName, setGuestName, guestNumError, handleAddGuest)}

        {/* Handball section */}
        <section className="handball-section">
          <h2 className="handball-title">Handball</h2>

          <div className="control-row">
            <label htmlFor="maxScorers" className="control-label">
              Max. Torschützen (Multiplikator)
            </label>
            <input
              id="maxScorers"
              type="number"
              min="1"
              className="control-input"
              value={maxScorersRaw}
              onChange={handleMaxScorersChange}
              onBlur={handleMaxScorersBlur}
            />
          </div>

          <div className="scoreboard scoreboard-multi">
            <span className="team-label">Heim</span>
            <span className="score-total score-multi">{homeMulti}</span>
            <span className="score-divider">:</span>
            <span className="score-total score-multi">{guestMulti}</span>
            <span className="team-label">Gast</span>
          </div>

          <div className="multi-detail">
            <span>{totalHome} × {homeScorersCount} = {homeMulti}</span>
            <span className="detail-divider">|</span>
            <span>{totalGuest} × {guestScorersCount} = {guestMulti}</span>
          </div>
        </section>

        {/* Action buttons */}
        <div className="action-bar">
          <button
            className="action-btn action-btn-copy"
            onClick={handleCopy}
          >
            {copyStatus === 'copied' ? '✓ Kopiert!' : 'Ergebnis kopieren'}
          </button>
          <button
            className={`action-btn action-btn-reset ${resetStep === 1 ? 'action-btn-reset-confirm' : ''}`}
            onClick={handleResetClick}
          >
            {resetStep === 1 ? 'Sicher? Erneut tippen' : 'Zurücksetzen'}
          </button>
        </div>
      </main>
    </div>
  )
}
