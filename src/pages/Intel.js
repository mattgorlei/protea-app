import { useState, useEffect, useCallback } from 'react'
import { supabase, SECTORS, LOUGH_SECTORS } from '../lib/supabase'
import SectorMap from '../components/SectorMap'
import SectorPlan from './SectorPlan'

function IntelEntry({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const typeColors = {
    fish_feedback: 'rgba(29,158,117,0.4)',
    observation: 'rgba(255,179,2,0.4)',
    end_of_day: 'rgba(127,119,221,0.4)',
    competition: 'rgba(212,83,126,0.4)',
  }
  const typeLabels = {
    fish_feedback: 'Fish feedback', observation: 'Observation',
    end_of_day: 'End of day', competition: 'Comp session',
  }
  function summary() {
    if (entry.entry_type === 'observation') return entry.obs_learning || ''
    if (entry.entry_type === 'end_of_day') return entry.eod_general_feedback || `Confidence ${entry.eod_confidence}/5`
    if (entry.entry_type === 'competition') return `${entry.comp_fish_count || 0} fish · ${entry.comp_placing || ''}`
    if (entry.entry_type === 'fish_feedback') {
      const parts = []
      if (entry.flies?.name) parts.push(`${entry.flies.name} #${entry.flies.size}`)
      if (entry.line_used) parts.push(entry.line_used)
      if (entry.method || entry.river_method) parts.push(entry.method || entry.river_method)
      if (entry.retrieve_speed) parts.push(entry.retrieve_speed)
      if (entry.retrieve_activations?.length) parts.push(entry.retrieve_activations.slice(0,3).join(', '))
      if (entry.additional_notes) parts.push(entry.additional_notes)
      return parts.join(' · ')
    }
    return ''
  }
  function details() {
    const rows = []
    if (entry.session_time) rows.push({ label: 'Time', value: entry.session_time })
    if (entry.practice_water_name) rows.push({ label: 'Practice water', value: entry.practice_water_name })
    if (entry.entry_type === 'fish_feedback') {
      if (entry.flies?.name) rows.push({ label: 'Fly', value: `${entry.flies.name} #${entry.flies.size}` })
      if (entry.line_used) rows.push({ label: 'Line', value: entry.line_used })
      if (entry.method || entry.river_method) rows.push({ label: 'Method', value: entry.method || entry.river_method })
      if (entry.retrieve_speed) rows.push({ label: 'Speed', value: entry.retrieve_speed })
      if (entry.retrieve_activations?.length) rows.push({ label: 'Activation', value: entry.retrieve_activations.join(', ') })
      if (entry.additional_notes) rows.push({ label: 'Notes', value: entry.additional_notes })
    }
    if (entry.entry_type === 'observation') {
      if (entry.obs_learning) rows.push({ label: 'Learning', value: entry.obs_learning })
      if (entry.obs_importance) rows.push({ label: 'Why it matters', value: entry.obs_importance })
      if (entry.obs_other) rows.push({ label: 'Other', value: entry.obs_other })
    }
    if (entry.entry_type === 'end_of_day') {
      if (entry.eod_practiced_for) rows.push({ label: 'Practiced for', value: entry.eod_practiced_for })
      if (entry.eod_confidence) rows.push({ label: 'Confidence', value: `${entry.eod_confidence}/5` })
      if (entry.eod_key_learnings?.length) rows.push({ label: 'Key learnings', value: entry.eod_key_learnings.join(' · ') })
      if (entry.eod_biggest_challenge) rows.push({ label: 'Challenge', value: entry.eod_biggest_challenge })
      if (entry.eod_general_feedback) rows.push({ label: 'Feedback', value: entry.eod_general_feedback })
    }
    if (entry.entry_type === 'competition') {
      if (entry.comp_fish_count != null) rows.push({ label: 'Fish', value: entry.comp_fish_count })
      if (entry.comp_placing) rows.push({ label: 'Placing', value: entry.comp_placing })
      if (entry.comp_most_effective_method) rows.push({ label: 'Best method', value: entry.comp_most_effective_method })
      if (entry.comp_technique_description) rows.push({ label: 'Technique', value: entry.comp_technique_description })
      if (entry.comp_suggestion_to_next) rows.push({ label: 'Tip for next', value: entry.comp_suggestion_to_next })
    }
    return rows
  }
  const borderColor = typeColors[entry.entry_type] || 'var(--border)'
  return (
    <div className="feed-item" style={{ borderColor, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span className="feed-tag" style={{ borderColor }}>{typeLabels[entry.entry_type]}</span>
        <span className="feed-tag">{entry.profiles?.name}</span>
        {entry.profiles?.team && <span className={`badge badge-${entry.profiles.team.toLowerCase()}`}>{entry.profiles.team}</span>}
        {entry.session_time && <span className="feed-tag">🕐 {entry.session_time}</span>}
        {entry.entry_mode === 'practice' && <span className="feed-tag" style={{ color: 'var(--gold)', borderColor: 'rgba(255,179,2,0.3)' }}>Practice</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, cursor: 'pointer', marginBottom: expanded ? 10 : 0 }} onClick={() => setExpanded(v => !v)}>
        {summary()}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          {details().map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)', minWidth: 110, flexShrink: 0 }}>{label}</span>
              <span style={{ color: 'var(--text)', lineHeight: 1.45 }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Intel({ profile }) {
  const [sector, setSector] = useState(SECTORS[0])
  const [view, setView] = useState('intel')
  const [entries, setEntries] = useState([])
  const [practiceWaters, setPracticeWaters] = useState([])
  const [flies, setFlies] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [entriesRes, fliesRes, pwRes] = await Promise.all([
        sector.startsWith('pw:')
          ? supabase.from('entries').select('*, profiles(name, team), flies(name, size)').eq('practice_water_name', sector.replace('pw:', '')).order('created_at', { ascending: false }).limit(50)
          : supabase.from('entries').select('*, profiles(name, team), flies(name, size)').or(`sector.eq.${sector},applicable_sectors.cs.{"${sector}"}`).order('created_at', { ascending: false }).limit(50),
        supabase.from('flies').select('*'),
        supabase.from('practice_waters').select('*').order('name'),
      ])
      setEntries(entriesRes.data || [])
      setFlies(fliesRes.data || [])
      setPracticeWaters(pwRes.data || [])
    } catch(err) {
      console.error('Intel fetch error:', err)
    }
    setLoading(false)
  }, [sector])

  useEffect(() => { setView('intel'); fetchData() }, [fetchData])

  const compFishEntries = entries.filter(e => e.entry_type === 'competition')
  const practiceFishEntries = entries.filter(e => e.entry_type === 'fish_feedback' && e.entry_mode === 'practice')
  const totalFish = compFishEntries.reduce((sum, e) => sum + (e.comp_fish_count || 0), 0)
  const practiceFishCount = practiceFishEntries.filter(e => e.fly_id).length
  const eodEntries = entries.filter(e => e.entry_type === 'end_of_day')
  const avgConfidence = eodEntries.length
    ? (eodEntries.reduce((s, e) => s + (e.eod_confidence || 0), 0) / eodEntries.length).toFixed(1) : '–'
  const methodCounts = {}
  entries.forEach(e => { const m = e.method || e.river_method || e.comp_most_effective_method; if (m) methodCounts[m] = (methodCounts[m] || 0) + 1 })
  const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '–'
  const flyCounts = {}
  entries.forEach(e => { if (e.fly_id) flyCounts[e.fly_id] = (flyCounts[e.fly_id] || 0) + 1 })
  const topFlies = Object.entries(flyCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, count]) => ({ fly: flies.find(f => f.id === id), count })).filter(x => x.fly)
  const recentIntel = entries.slice(0, 10)

  return (
    <div className="screen active">
      <div className="sector-scroll">
        {['All Loughs', ...SECTORS].map(s => (
          <div key={s} className={`sector-pill ${sector === s ? 'active' : ''}`} onClick={() => setSector(s)}>{s}</div>
        ))}
        {practiceWaters.map(pw => (
          <div key={pw.id}
            className={`sector-pill ${sector === 'pw:' + pw.name ? 'active' : ''}`}
            style={sector !== 'pw:' + pw.name ? { borderColor: 'rgba(255,179,2,0.4)', color: 'var(--gold)' } : { background: 'var(--gold)', color: 'var(--gold-dark)', borderColor: 'var(--gold)' }}
            onClick={() => setSector('pw:' + pw.name)}
          >{pw.name}</div>
        ))}
      </div>

      <div className="segment" style={{ marginBottom: 16 }}>
        <button className={`seg-btn ${view === 'intel' ? 'active' : ''}`} onClick={() => setView('intel')}>📊 Intel</button>
        <button className={`seg-btn ${view === 'plan' ? 'active' : ''}`} onClick={() => setView('plan')}>📋 Sector Plan</button>
      </div>

      {view === 'plan' && <SectorPlan sector={sector} profile={profile} />}

      {view === 'intel' && (
        <>
          {loading && <div className="spinner" />}
          {!loading && (
            <>
              <div className="stat-grid">
                <div className="stat-card"><div className="stat-label">Entries</div><div className="stat-val">{entries.length}</div></div>
                <div className="stat-card">
                  <div className="stat-label">Comp fish</div>
                  <div className="stat-val">{totalFish}{practiceFishCount > 0 && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>+{practiceFishCount}p</span>}</div>
                </div>
                <div className="stat-card"><div className="stat-label">Top method</div><div className="stat-val sm">{topMethod}</div></div>
                <div className="stat-card"><div className="stat-label">Confidence avg</div><div className="stat-val">{avgConfidence}</div></div>
              </div>

              {LOUGH_SECTORS.includes(sector) && (
                <>
                  <div className="section-label">Sector map</div>
                  <SectorMap sector={sector} profile={profile} flies={flies} />
                </>
              )}

              {topFlies.length > 0 && (
                <>
                  <div className="section-label" style={{ marginTop: 16 }}>Top flies</div>
                  <div className="card" style={{ padding: '10px 14px' }}>
                    {topFlies.map(({ fly, count }, i) => (
                      <div key={fly.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < topFlies.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{fly.name} #{fly.size}</div>
                          {fly.sector && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fly.sector}</div>}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{count} {count === 1 ? 'catch' : 'catches'}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {recentIntel.length > 0 && (
                <>
                  <div className="section-label" style={{ marginTop: 4 }}>Recent intel</div>
                  {recentIntel.map(e => <IntelEntry key={e.id} entry={e} />)}
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
        </>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}
