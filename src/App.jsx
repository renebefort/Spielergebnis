import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEYS = {
  playerCount: 'sg_playerCount',
  homeGoals: 'sg_homeGoals',
  guestGoals: 'sg_guestGoals',
  maxScorers: 'sg_maxScorers',
}

const DEFAULT_PLAYER_COUNT = 10

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function buildMarkdown(syncedHome, syncedGuest, totalHome, totalGuest, homeMulti, guestMulti, homeScorersCount, guestScorersCount, maxScorers) {
  const lines = []

  lines.push('# Spielergebnis')
  lines.push('')
  lines.push(`Heim **${totalHome}** : **${totalGuest}** Gast`)
  lines.push('')
  lines.push('## Torschützen')
  lines.push('')

  const formatList = (goalsArr) => {
    const scorers = goalsArr
      .map((goals, i) => ({ num: i + 1, goals }))
      .filter((p) => p.goals > 0)
    if (scorers.length === 0) return ['_(keine Tore)_']
    return scorers.map(
      (p) =>
        `- Spieler #${String(p.num).padStart(2, '0')}: ${p.goals} ${p.goals === 1 ? 'Tor' : 'Tore'}`
    )
  }

  lines.push('### Heim')
  lines.push(...formatList(syncedHome))
  lines.push('')
  lines.push('### Gast')
  lines.push(...formatList(syncedGuest))
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

function buildGoalsArray(stored, count) {
  const base = Array.isArray(stored) ? stored : []
  return Array.from({ length: count }, (_, i) => base[i] ?? 0)
}

export default function App() {
  const [playerCount, setPlayerCount] = useState(() =>
    Math.max(1, loadFromStorage(STORAGE_KEYS.playerCount, DEFAULT_PLAYER_COUNT))
  )

  const [homeGoals, setHomeGoals] = useState(() =>
    buildGoalsArray(
      loadFromStorage(STORAGE_KEYS.homeGoals, []),
      loadFromStorage(STORAGE_KEYS.playerCount, DEFAULT_PLAYER_COUNT)
    )
  )

  const [guestGoals, setGuestGoals] = useState(() =>
    buildGoalsArray(
      loadFromStorage(STORAGE_KEYS.guestGoals, []),
      loadFromStorage(STORAGE_KEYS.playerCount, DEFAULT_PLAYER_COUNT)
    )
  )

  const [maxScorers, setMaxScorers] = useState(() =>
    Math.max(1, loadFromStorage(STORAGE_KEYS.maxScorers, 1))
  )

  // Raw string values for the inputs so the user can clear and retype freely
  const [playerCountRaw, setPlayerCountRaw] = useState(() =>
    String(Math.max(1, loadFromStorage(STORAGE_KEYS.playerCount, DEFAULT_PLAYER_COUNT)))
  )
  const [maxScorersRaw, setMaxScorersRaw] = useState(() =>
    String(Math.max(1, loadFromStorage(STORAGE_KEYS.maxScorers, 1)))
  )

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.playerCount, JSON.stringify(playerCount))
  }, [playerCount])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.homeGoals, JSON.stringify(homeGoals))
  }, [homeGoals])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.guestGoals, JSON.stringify(guestGoals))
  }, [guestGoals])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.maxScorers, JSON.stringify(maxScorers))
  }, [maxScorers])

  // Synced views at current playerCount length
  const syncedHome = buildGoalsArray(homeGoals, playerCount)
  const syncedGuest = buildGoalsArray(guestGoals, playerCount)

  const handlePlayerCountChange = (e) => {
    setPlayerCountRaw(e.target.value)
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val >= 1 && val <= 50) {
      setPlayerCount(val)
      setHomeGoals(buildGoalsArray(homeGoals, val))
      setGuestGoals(buildGoalsArray(guestGoals, val))
    }
  }

  const handlePlayerCountBlur = () => {
    const val = parseInt(playerCountRaw, 10)
    const clamped = isNaN(val) ? playerCount : Math.min(50, Math.max(1, val))
    setPlayerCount(clamped)
    setPlayerCountRaw(String(clamped))
    setHomeGoals(buildGoalsArray(homeGoals, clamped))
    setGuestGoals(buildGoalsArray(guestGoals, clamped))
  }

  const changeGoal = useCallback((team, index, delta) => {
    const setter = team === 'home' ? setHomeGoals : setGuestGoals
    setter((prev) => {
      const arr = buildGoalsArray(prev, playerCount)
      arr[index] = Math.max(0, arr[index] + delta)
      return arr
    })
  }, [playerCount])

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

  const [copyStatus, setCopyStatus] = useState('idle') // idle | copied
  const [resetStep, setResetStep] = useState(0)        // 0 = normal, 1 = confirm
  const resetTimerRef = useRef(null)
  const [showHelp, setShowHelp] = useState(false)

  const totalHome = syncedHome.reduce((s, g) => s + g, 0)
  const totalGuest = syncedGuest.reduce((s, g) => s + g, 0)

  const homeScorersCount = Math.min(
    syncedHome.filter((g) => g > 0).length,
    maxScorers
  )
  const guestScorersCount = Math.min(
    syncedGuest.filter((g) => g > 0).length,
    maxScorers
  )
  const homeMulti = totalHome * homeScorersCount
  const guestMulti = totalGuest * guestScorersCount

  const handleCopy = useCallback(() => {
    const md = buildMarkdown(
      syncedHome, syncedGuest,
      totalHome, totalGuest,
      homeMulti, guestMulti,
      homeScorersCount, guestScorersCount,
      maxScorers
    )
    navigator.clipboard.writeText(md).then(() => {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    })
  }, [syncedHome, syncedGuest, totalHome, totalGuest, homeMulti, guestMulti, homeScorersCount, guestScorersCount, maxScorers])

  const handleResetClick = () => {
    if (resetStep === 0) {
      setResetStep(1)
      resetTimerRef.current = setTimeout(() => setResetStep(0), 3000)
    } else {
      clearTimeout(resetTimerRef.current)
      setResetStep(0)
      const emptyGoals = new Array(DEFAULT_PLAYER_COUNT).fill(0)
      setPlayerCount(DEFAULT_PLAYER_COUNT)
      setPlayerCountRaw(String(DEFAULT_PLAYER_COUNT))
      setHomeGoals(emptyGoals)
      setGuestGoals(emptyGoals)
      setMaxScorers(1)
      setMaxScorersRaw('1')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Spielergebnis</h1>
      </header>

      <main className="app-main">
        {/* Player count input */}
        <div className="control-row">
          <label htmlFor="playerCount" className="control-label">
            Anzahl Spieler
          </label>
          <div className="control-row-right">
            <input
              id="playerCount"
              type="number"
              min="1"
              max="50"
              className="control-input"
              value={playerCountRaw}
              onChange={handlePlayerCountChange}
              onBlur={handlePlayerCountBlur}
            />
            <button
              className="help-btn"
              onClick={() => setShowHelp(true)}
              aria-label="Anleitung anzeigen"
              title="Anleitung"
            >
              ?
            </button>
          </div>
        </div>

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

                <h3>Spieleranzahl</h3>
                <p>Gebt zu Beginn die Anzahl der Spieler ein – gemeint ist die höchste Trikonummer im Spiel. Für jede Trikonummer wird eine Zeile angezeigt. Die Nummern beginnen bei 1 und sind fortlaufend.</p>

                <h3>Tore erfassen</h3>
                <p>Pro Trikonummer könnt ihr über die Plus/Minus-Tasten die Tore für die Heim- oder Gastmannschaft eintragen.</p>

                <h3>Handball – Multiplikator</h3>
                <p>Im unteren Bereich findet ihr die spezielle Regelung für den Jugendhandball. Tragt dort die maximale Anzahl der Torschützen ein. Dieser Wert kann kleiner sein als die Gesamtzahl der Spieler, da manche Trikonummern im Spiel nicht besetzt sind oder beide Mannschaften unterschiedlich viele Spieler haben. Der Multiplikator fließt in die Berechnung des Endergebnisses ein.</p>

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

        {/* Column headers */}
        <div className="column-headers">
          <span className="col-header-team">Heim</span>
          <span className="col-header-num">Trikonummer</span>
          <span className="col-header-team">Gast</span>
        </div>

        {/* Player rows */}
        <div className="player-list">
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i} className="player-row">
              {/* Home side */}
              <div className="goal-cell">
                <button
                  className="btn btn-minus"
                  onClick={() => changeGoal('home', i, -1)}
                  aria-label={`Heim Spieler ${i + 1} Tor entfernen`}
                  disabled={syncedHome[i] === 0}
                >
                  −
                </button>
                <span className="goal-value">{syncedHome[i]}</span>
                <button
                  className="btn btn-plus"
                  onClick={() => changeGoal('home', i, 1)}
                  aria-label={`Heim Spieler ${i + 1} Tor hinzufügen`}
                >
                  +
                </button>
              </div>

              {/* Player number */}
              <div className="player-num">
                #{String(i + 1).padStart(2, '0')}
              </div>

              {/* Guest side */}
              <div className="goal-cell goal-cell-guest">
                <button
                  className="btn btn-plus"
                  onClick={() => changeGoal('guest', i, 1)}
                  aria-label={`Gast Spieler ${i + 1} Tor hinzufügen`}
                >
                  +
                </button>
                <span className="goal-value">{syncedGuest[i]}</span>
                <button
                  className="btn btn-minus"
                  onClick={() => changeGoal('guest', i, -1)}
                  aria-label={`Gast Spieler ${i + 1} Tor entfernen`}
                  disabled={syncedGuest[i] === 0}
                >
                  −
                </button>
              </div>
            </div>
          ))}
        </div>

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
