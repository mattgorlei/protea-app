import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const TEAMS = [
  {
    id: 'mamba',
    name: 'Black Mamba Boys',
    color: '#F09595',
    bg: 'rgba(240,149,149,0.12)',
    members: ['Matt B', 'Chris T', 'Marc VR', 'Daniel VW', 'Luke H'],
  },
  {
    id: 'dobermans',
    name: 'The Dobermans',
    color: '#85B7EB',
    bg: 'rgba(133,183,235,0.12)',
    members: ['Brian R', 'Dru G', 'Le Roux R', 'Adriaan DH', 'Ewan O'],
  },
  {
    id: 'germans',
    name: 'The Germans',
    color: '#FFB302',
    bg: 'rgba(255,179,2,0.12)',
    members: ['Matt G', 'Ruan J', 'Byron T', 'Jabsi L', 'Ludwick E'],
  },
]

const ALL_PLAYERS = TEAMS.flatMap(t => t.members.map(m => ({ name: m, team: t.id })))

function getTeam(playerId) {
  return TEAMS.find(t => t.members.includes(playerId))
}

const SESSIONS = ['Session 1', 'Session 2', 'Session 3']

// Boats: 5 boats x 3 players
const DEFAULT_BOATS = [
  ['Matt B', 'Brian R', 'Matt G'],
  ['Chris T', 'Dru G', 'Ruan J'],
  ['Marc VR', 'Le Roux R', 'Byron T'],
  ['Daniel VW', 'Adriaan DH', 'Jabsi L'],
  ['Luke H', 'Ewan O', 'Ludwick E'],
]

export default function MiniComp({ profile }) {
  const isCoach = ['coach', 'manager'].includes(profile?.role?.toLowerCase())
  const [tab, setTab] = useState('leaderboard')
  const [sessions, setSessions] = useState([])
  const [boats, setBoats] = useState(DEFAULT_BOATS)
  const [loading, setLoading] = useState(true)

  // Session entry state
  const [activeSession, setActiveSession] = useState('Session 1')
  const [fishCounts, setFishCounts] = useState({})
  const [saving, setSaving] = useState(false)

  // Team management
  const [editingBoats, setEditingBoats] = useState(false)
  const [draftBoats, setDraftBoats] = useState(DEFAULT_BOATS)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: sessData } = await supabase.from('mini_comp_sessions').select('*').order('created_at')
    const { data: boatData } = await supabase.from('mini_comp_boats').select('*').order('boat_number')
    if (sessData) setSessions(sessData)
    if (boatData && boatData.length > 0) {
      const b = [[], [], [], [], []]
      boatData.forEach(row => { b[row.boat_number - 1] = row.players })
      setBoats(b)
      setDraftBoats(b)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Calculate scores from all sessions
  function calcScores() {
    const scores = {}
    ALL_PLAYERS.forEach(p => { scores[p.name] = 0 })

    sessions.forEach(sess => {
      const counts = sess.fish_counts || {}
      const boatsList = sess.boats || boats

      boatsList.forEach(boat => {
        boat.forEach(angler => {
          const caught = counts[angler] || 0
          if (caught > 0) {
            scores[angler] = (scores[angler] || 0) + caught
            // -1 for each other angler on same boat per fish caught
            boat.forEach(other => {
              if (other !== angler) {
                scores[other] = (scores[other] || 0) - caught
              }
            })
          }
        })
      })
    })

    return scores
  }

  const scores = calcScores()

  // Individual rankings
  const individualRankings = ALL_PLAYERS
    .map(p => ({ ...p, score: scores[p.name] || 0 }))
    .sort((a, b) => b.score - a.score)

  // Team rankings
  const teamRankings = TEAMS.map(t => ({
    ...t,
    score: t.members.reduce((sum, m) => sum + (scores[m] || 0), 0),
    members: t.members.map(m => ({ name: m, score: scores[m] || 0 }))
  })).sort((a, b) => b.score - a.score)

  async function saveSession() {
    setSaving(true)
    const existing = sessions.find(s => s.session_name === activeSession)
    if (existing) {
      await supabase.from('mini_comp_sessions').update({ fish_counts: fishCounts, boats }).eq('id', existing.id)
    } else {
      await supabase.from('mini_comp_sessions').insert({ session_name: activeSession, fish_counts: fishCounts, boats })
    }
    await fetchData()
    setFishCounts({})
    setSaving(false)
  }

  async function saveBoats() {
    setSaving(true)
    await supabase.from('mini_comp_boats').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    for (let i = 0; i < draftBoats.length; i++) {
      await supabase.from('mini_comp_boats').insert({ boat_number: i + 1, players: draftBoats[i] })
    }
    setBoats(draftBoats)
    setEditingBoats(false)
    setSaving(false)
  }

  // Load existing session counts when switching sessions
  useEffect(() => {
    const existing = sessions.find(s => s.session_name === activeSession)
    setFishCounts(existing?.fish_counts || {})
  }, [activeSession, sessions])

  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`

  if (loading) return <div className="screen active"><div className="spinner" /></div>

  return (
    <div className="screen active">
      {/* Header */}
      <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'rgba(232,240,240,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Dunglow Lough · Practice Mini-Comp</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)', marginTop: 2 }}>3-Day Team Challenge</div>
        <div style={{ fontSize: 12, color: 'rgba(232,240,240,0.7)', marginTop: 4 }}>Fish 20cm+ count · +1 catch · -1 per boat partner catch</div>
      </div>

      {/* Tabs */}
      <div className="segment" style={{ marginBottom: 14 }}>
        <button className={`seg-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>🏆 Leaderboard</button>
        {isCoach && <button className={`seg-btn ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>📝 Log scores</button>}
        {isCoach && <button className={`seg-btn ${tab === 'boats' ? 'active' : ''}`} onClick={() => setTab('boats')}>⛵ Boats</button>}
      </div>

      {/* LEADERBOARD */}
      {tab === 'leaderboard' && (
        <>
          <div className="section-label">Team standings</div>
          {teamRankings.map((team, i) => (
            <div key={team.id} style={{ background: team.bg, border: `1px solid ${team.color}44`, borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{medal(i)}</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: team.color }}>{team.name}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: team.color }}>{team.score > 0 ? '+' : ''}{team.score}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {team.members.sort((a, b) => b.score - a.score).map(m => (
                  <div key={m.name} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
                    <span style={{ color: 'var(--text)' }}>{m.name}</span>
                    <span style={{ color: m.score >= 0 ? team.color : '#F09595', fontWeight: 700, marginLeft: 6 }}>{m.score > 0 ? '+' : ''}{m.score}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="section-label" style={{ marginTop: 8 }}>Individual rankings</div>
          <div className="card" style={{ padding: '8px 14px' }}>
            {individualRankings.map((p, i) => {
              const team = getTeam(p.name)
              return (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < individualRankings.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 14, minWidth: 28, color: 'var(--text-muted)' }}>{medal(i)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: team?.color || 'var(--text-muted)' }}>{team?.name}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: p.score >= 0 ? 'var(--gold)' : '#F09595' }}>
                    {p.score > 0 ? '+' : ''}{p.score}
                  </div>
                </div>
              )
            })}
          </div>

          {sessions.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 8 }}>Sessions logged</div>
              {sessions.map(s => (
                <div key={s.id} className="card" style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{s.session_name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(s.fish_counts || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                      <div key={name} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '3px 10px', fontSize: 12 }}>
                        <span style={{ color: 'var(--text)' }}>{name}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 700, marginLeft: 6 }}>{count} 🐟</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* LOG SCORES */}
      {tab === 'log' && isCoach && (
        <>
          <div className="section-label">Session</div>
          <div className="segment" style={{ marginBottom: 16 }}>
            {SESSIONS.map(s => (
              <button key={s} className={`seg-btn ${activeSession === s ? 'active' : ''}`} onClick={() => setActiveSession(s)}>
                {s}
                {sessions.find(ss => ss.session_name === s) && <span style={{ color: 'var(--gold)', marginLeft: 4 }}>✓</span>}
              </button>
            ))}
          </div>

          {boats.map((boat, bi) => (
            <div key={bi} className="card" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Boat {bi + 1}</div>
              {boat.map(angler => {
                const team = getTeam(angler)
                return (
                  <div key={angler} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: 'var(--text)' }}>{angler}</div>
                      <div style={{ fontSize: 11, color: team?.color || 'var(--text-muted)' }}>{team?.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setFishCounts(prev => ({ ...prev, [angler]: Math.max(0, (prev[angler] || 0) - 1) }))}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-input)', border: '0.5px solid var(--border)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <div style={{ minWidth: 28, textAlign: 'center', fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{fishCounts[angler] || 0}</div>
                      <button onClick={() => setFishCounts(prev => ({ ...prev, [angler]: (prev[angler] || 0) + 1 }))}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', border: 'none', color: '#e8f0f0', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          <button className="btn btn-gold" onClick={saveSession} disabled={saving}>
            {saving ? 'Saving...' : `Save ${activeSession} scores`}
          </button>
          <div style={{ height: 20 }} />
        </>
      )}

      {/* BOATS MANAGEMENT */}
      {tab === 'boats' && isCoach && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-label" style={{ marginBottom: 0 }}>Boat assignments</div>
            {!editingBoats
              ? <button onClick={() => setEditingBoats(true)} style={{ fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Edit</button>
              : <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={saveBoats} disabled={saving} style={{ fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => { setEditingBoats(false); setDraftBoats(boats) }} style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
            }
          </div>

          {(editingBoats ? draftBoats : boats).map((boat, bi) => (
            <div key={bi} className="card">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>Boat {bi + 1}</div>
              {boat.map((angler, ai) => {
                const team = getTeam(angler)
                return editingBoats ? (
                  <div key={ai} style={{ marginBottom: 8 }}>
                    <select
                      value={angler}
                      onChange={e => {
                        const newBoats = draftBoats.map(b => [...b])
                        newBoats[bi][ai] = e.target.value
                        setDraftBoats(newBoats)
                      }}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, padding: '8px 10px' }}
                    >
                      {ALL_PLAYERS.map(p => <option key={p.name} value={p.name}>{p.name} ({getTeam(p.name)?.name})</option>)}
                    </select>
                  </div>
                ) : (
                  <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: team?.color || '#888', flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{angler}</div>
                    <div style={{ fontSize: 11, color: team?.color, marginLeft: 'auto' }}>{team?.name}</div>
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{ height: 20 }} />
        </>
      )}
    </div>
  )
}
