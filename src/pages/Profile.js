import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Competition date: July 14 2026 (first comp session)
const COMP_DATE = new Date('2026-07-17T08:00:00')

function daysUntilComp() {
  const now = new Date()
  const diff = COMP_DATE - now
  if (diff <= 0) return null
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function Profile({ profile, isCoach, showToast }) {
  const [entries, setEntries] = useState([])
  const [flies, setFlies] = useState([])
  const [todayFocus, setTodayFocus] = useState('')
  const [editingFocus, setEditingFocus] = useState(false)
  const [focusText, setFocusText] = useState('')
  const [savingFocus, setSavingFocus] = useState(false)
  const [loading, setLoading] = useState(true)
  const daysLeft = daysUntilComp()

  const fetchData = useCallback(async () => {
    try {
    const [entriesRes, focusRes, fliesRes] = await Promise.all([
      supabase.from('entries').select('*, flies(name, size)').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('team_focus').select('*').order('created_at', { ascending: false }).limit(1),
      supabase.from('flies').select('*'),
    ])
    setEntries(entriesRes.data || [])
    const focusBody = focusRes.data?.[0]?.body || ''
    setTodayFocus(focusBody)
    setFocusText(focusBody)
    setFlies(fliesRes.data || [])
    setLoading(false)
    } catch(err) { console.error('Profile fetch error:', err); setLoading(false) }
  }, [profile.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveFocus() {
    setSavingFocus(true)
    await supabase.from('team_focus').upsert({ id: 1, body: focusText, updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    setTodayFocus(focusText)
    setEditingFocus(false)
    setSavingFocus(false)
    showToast('Focus updated')
  }

  // Stats
  const totalEntries = entries.length
  const fishFeedback = entries.filter(e => e.entry_type === 'fish_feedback')
  const observations = entries.filter(e => e.entry_type === 'observation')
  const eodEntries = entries.filter(e => e.entry_type === 'end_of_day')
  const compEntries = entries.filter(e => e.entry_type === 'competition')
  const avgConfidence = eodEntries.length
    ? (eodEntries.reduce((s, e) => s + (e.eod_confidence || 0), 0) / eodEntries.length).toFixed(1)
    : '–'

  // Top fly
  const flyCounts = {}
  entries.forEach(e => { if (e.fly_id) flyCounts[e.fly_id] = (flyCounts[e.fly_id] || 0) + 1 })
  const topFlyId = Object.entries(flyCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topFly = flies.find(f => f.id === topFlyId)

  // Sectors logged
  const sectorCounts = {}
  entries.forEach(e => { if (e.sector) sectorCounts[e.sector] = (sectorCounts[e.sector] || 0) + 1 })

  // Recent entries
  const recent = entries.slice(0, 5)

  const entryTypeLabel = { fish_feedback: 'Fish feedback', observation: 'Observation', end_of_day: 'End of day', competition: 'Comp session' }
  const entryTypeColor = { fish_feedback: 'rgba(29,158,117,0.4)', observation: 'rgba(255,179,2,0.4)', end_of_day: 'rgba(127,119,221,0.4)', competition: 'rgba(212,83,126,0.4)' }

  if (loading) return <div className="screen active"><div className="spinner" /></div>

  return (
    <div className="screen active">

      {/* Countdown + Today's Focus */}
      <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
        {daysLeft !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: todayFocus ? 12 : 0 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(232,240,240,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Competition in</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold)', lineHeight: 1.1 }}>{daysLeft}<span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4 }}>days</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(232,240,240,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>WYFFC</div>
              <div style={{ fontSize: 13, color: '#e8f0f0', fontWeight: 500 }}>Donegal 2026</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>🏆 Competition week — go get it!</div>
        )}

        {/* Today's focus */}
        {isCoach && editingFocus ? (
          <div style={{ marginTop: 10 }}>
            <textarea
              rows={3}
              value={focusText}
              onChange={e => setFocusText(e.target.value)}
              placeholder="Set today's focus for the team..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#e8f0f0', fontSize: 13, padding: '8px 10px', resize: 'none', fontFamily: 'inherit', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={saveFocus} disabled={savingFocus} style={{ flex: 1, padding: '8px', background: 'var(--gold)', color: 'var(--gold-dark)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {savingFocus ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditingFocus(false)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', color: '#e8f0f0', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: todayFocus || isCoach ? 12 : 0 }}>
            {todayFocus ? (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'rgba(232,240,240,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Today's focus</div>
                <div style={{ fontSize: 13, color: '#e8f0f0', lineHeight: 1.6 }}>{todayFocus}</div>
              </div>
            ) : null}
            {isCoach && (
              <button onClick={() => setEditingFocus(true)} style={{ marginTop: todayFocus ? 8 : 0, fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                {todayFocus ? '✏️ Edit focus' : '+ Set today\'s focus'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--gold)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
          {profile.initials || profile.name?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{profile.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{profile.team} · {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Total logs</div><div className="stat-val">{totalEntries}</div></div>
        <div className="stat-card"><div className="stat-label">Fish feedback</div><div className="stat-val">{fishFeedback.length}</div></div>
        <div className="stat-card"><div className="stat-label">Observations</div><div className="stat-val">{observations.length}</div></div>
        <div className="stat-card"><div className="stat-label">Avg confidence</div><div className="stat-val">{avgConfidence}</div></div>
      </div>

      {/* Top fly */}
      {topFly && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {topFly.photo_url ? <img src={topFly.photo_url} alt={topFly.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>🪰</span>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 2 }}>Your top fly</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{topFly.name} #{topFly.size}</div>
            <div style={{ fontSize: 12, color: 'var(--gold)' }}>{flyCounts[topFlyId]} catch{flyCounts[topFlyId] !== 1 ? 'es' : ''}</div>
          </div>
        </div>
      )}

      {/* Sectors logged */}
      {Object.keys(sectorCounts).length > 0 && (
        <>
          <div className="section-label">Sectors logged</div>
          <div className="card" style={{ padding: '10px 14px' }}>
            {Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).map(([s, count], i, arr) => (
              <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{s}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{count} {count === 1 ? 'entry' : 'entries'}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent entries */}
      {recent.length > 0 && (
        <>
          <div className="section-label">Recent entries</div>
          {recent.map(e => (
            <div key={e.id} className="feed-item" style={{ borderColor: entryTypeColor[e.entry_type], marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span className="feed-tag">{entryTypeLabel[e.entry_type] || e.entry_type}</span>
                <span className="feed-tag">{e.sector}</span>
                {e.session_time && <span className="feed-tag">🕐 {e.session_time}</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                {e.entry_type === 'fish_feedback' && [e.flies?.name ? `${e.flies.name} #${e.flies.size}` : null, e.line_used, e.method, e.retrieve_speed].filter(Boolean).join(' · ')}
                {e.entry_type === 'observation' && (e.obs_learning || '')}
                {e.entry_type === 'end_of_day' && (e.eod_general_feedback || `Confidence ${e.eod_confidence}/5`)}
                {e.entry_type === 'competition' && `${e.comp_fish_count || 0} fish · ${e.comp_placing || ''}`}
              </div>
            </div>
          ))}
        </>
      )}

      {totalEntries === 0 && (
        <div className="empty-state">
          <div className="icon">📝</div>
          <p>No entries yet.<br />Start logging to see your stats here.</p>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
