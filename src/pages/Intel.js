import { useState, useEffect, useCallback } from 'react'
import { supabase, SECTORS, LOUGH_SECTORS } from '../lib/supabase'
import SectorMap from '../components/SectorMap'

export default function Intel({ profile }) {
  const [sector, setSector] = useState(SECTORS[0])
  const [entries, setEntries] = useState([])
  const [practiceWaters, setPracticeWaters] = useState([])
  const [flies, setFlies] = useState([])
  const [plan, setPlan] = useState(null)
  const [editing, setEditing] = useState(false)
  const [planText, setPlanText] = useState('')
  const [loading, setLoading] = useState(true)

  const isCoach = ['coach', 'manager'].includes(profile?.role)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [entriesRes, planRes, fliesRes, pwRes] = await Promise.all([
      sector.startsWith('pw:')
        ? supabase.from('entries').select('*, profiles(name, team)').eq('practice_water_name', sector.replace('pw:', '')).order('created_at', { ascending: false }).limit(30)
        : supabase.from('entries').select('*, profiles(name, team)').or(`sector.eq.${sector},applicable_sectors.cs.{"${sector}"}`).order('created_at', { ascending: false }).limit(30),
      sector.startsWith('pw:') ? Promise.resolve({ data: null }) : supabase.from('sector_plans').select('*').eq('sector', sector).single(),
      supabase.from('flies').select('*'),
      supabase.from('practice_waters').select('*').order('name'),
    ])

    setEntries(entriesRes.data || [])
    setPlan(planRes.data)
    setPracticeWaters(pwRes.data || [])
    setPlanText(planRes.data?.plan_text || '')
    setFlies(fliesRes.data || [])
    setLoading(false)
  }, [sector])

  useEffect(() => { fetchData() }, [fetchData])

  async function savePlan() {
    await supabase.from('sector_plans').upsert({
      sector,
      plan_text: planText,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'sector' })
    setEditing(false)
    fetchData()
  }

  // Compute stats
  const compFishEntries = entries.filter(e => e.entry_type === 'competition')
  const practiceFishEntries = entries.filter(e => e.entry_type === 'fish_feedback' && e.entry_mode === 'practice')
  const totalFish = compFishEntries.reduce((sum, e) => sum + (e.comp_fish_count || 0), 0)
  const practiceFishCount = practiceFishEntries.filter(e => e.fly_id).length
  const eodEntries = entries.filter(e => e.entry_type === 'end_of_day')
  const avgConfidence = eodEntries.length
    ? (eodEntries.reduce((s, e) => s + (e.eod_confidence || 0), 0) / eodEntries.length).toFixed(1)
    : '–'

  // Top flies
  const flyCounts = {}
  entries.forEach(e => {
    if (e.fly_id) flyCounts[e.fly_id] = (flyCounts[e.fly_id] || 0) + 1
  })
  const topFlies = Object.entries(flyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ fly: flies.find(f => f.id === id), count }))
    .filter(x => x.fly)

  // Top methods
  const methodCounts = {}
  entries.forEach(e => {
    const m = e.method || e.river_method || e.comp_most_effective_method
    if (m) methodCounts[m] = (methodCounts[m] || 0) + 1
  })
  const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '–'

  const recentIntel = entries.filter(e => ['fish_feedback', 'observation'].includes(e.entry_type)).slice(0, 5)

  function entrySnippet(e) {
    if (e.entry_type === 'observation') return e.obs_learning || ''
    const parts = []
    if (e.line_used) parts.push(e.line_used)
    if (e.retrieve_activations?.length) parts.push(e.retrieve_activations.slice(0, 2).join(', '))
    if (e.additional_notes) parts.push(e.additional_notes)
    return parts.join(' · ')
  }

  return (
    <div className="screen active" id="screen-intel">
      <div className="sector-scroll">
        {['All Loughs', ...SECTORS].map(s => (
          <div key={s} className={`sector-pill ${sector === s ? 'active' : ''}`} onClick={() => setSector(s)}>
            {s}
          </div>
        ))}
        {practiceWaters.map(pw => (
          <div
            key={pw.id}
            className={`sector-pill ${sector === 'pw:' + pw.name ? 'active' : ''}`}
            style={sector !== 'pw:' + pw.name ? { borderColor: 'rgba(255,179,2,0.4)', color: 'var(--gold)' } : { background: 'var(--gold)', color: 'var(--gold-dark)', borderColor: 'var(--gold)' }}
            onClick={() => setSector('pw:' + pw.name)}
          >
            {pw.name}
          </div>
        ))}
      </div>

      {loading && <div className="spinner" />}

      {!loading && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-label">Entries</div><div className="stat-val">{entries.length}</div></div>
            <div className="stat-card"><div className="stat-label">Fish logged</div><div className="stat-val">{totalFish}</div></div>
            <div className="stat-card"><div className="stat-label">Top method</div><div className="stat-val sm">{topMethod}</div></div>
            <div className="stat-card"><div className="stat-label">Confidence avg</div><div className="stat-val">{avgConfidence}</div></div>
          </div>

          <div className="section-label">Coach session plan</div>
          <div className="plan-card">
            {editing ? (
              <>
                <textarea
                  className="plan-edit-area"
                  rows={5}
                  value={planText}
                  onChange={e => setPlanText(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn" style={{ marginTop: 0 }} onClick={savePlan}>Save plan</button>
                  <button className="btn btn-secondary" style={{ marginTop: 0 }} onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="plan-text">{plan?.plan_text || 'No plan set yet.'}</div>
                {isCoach && (
                  <button
                    style={{ marginTop: 10, fontSize: 13, color: 'var(--green-mid)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => setEditing(true)}
                  >
                    Edit plan
                  </button>
                )}
              </>
            )}
          </div>

          {LOUGH_SECTORS.includes(sector) && (
            <>
              <div className="section-label">Sector map</div>
              <SectorMap sector={sector} profile={profile} flies={flies} />
            </>
          )}

          {topFlies.length > 0 && (
            <>
              <div className="section-label">Top flies</div>
              <div className="card" style={{ padding: '10px 14px' }}>
                {topFlies.map(({ fly, count }, i) => (
                  <div key={fly.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: i < topFlies.length - 1 ? '0.5px solid var(--border)' : 'none'
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{fly.name} #{fly.size}</div>
                      {fly.sector && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fly.sector}</div>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-mid)' }}>{count} {count === 1 ? 'catch' : 'catches'}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {recentIntel.length > 0 && (
            <>
              <div className="section-label">Recent intel</div>
              {recentIntel.map(e => (
                <div className="feed-item" key={e.id} style={{ marginBottom: 8 }}>
                  <div className="feed-tags">
                    <span className="feed-tag">{e.entry_type === 'observation' ? 'Observation' : 'Fish feedback'}</span>
                    <span className="feed-tag">{e.profiles?.name}</span>
                    {e.profiles?.team && <span className={`badge badge-${e.profiles.team.toLowerCase()}`}>{e.profiles.team}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{entrySnippet(e)}</div>
                </div>
              ))}
            </>
          )}

          {entries.length === 0 && (
            <div className="empty-state">
              <div className="icon">📊</div>
              <p>No data yet for {sector}.<br />Intel builds as the team logs entries.</p>
            </div>
          )}
        </>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}
