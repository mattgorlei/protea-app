import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SECTIONS = [
  { id: 'lough', label: 'Lough Sector Prep', icon: '🌊' },
  { id: 'river', label: 'River Sector Prep', icon: '🏞️' },
  { id: 'general', label: 'General Prep', icon: '✅' },
  { id: 'fly_tying', label: 'Fly Tying', icon: '🪰' },
]

const BEAD_COLOURS = ['None', 'Gold', 'Silver', 'Copper', 'Black', 'Pink', 'Red', 'Orange', 'Tungsten']

export default function PrepChecklist({ profile }) {
  const isCoach = ['coach', 'manager'].includes(profile?.role?.toLowerCase())
  const [items, setItems] = useState([])
  const [completions, setCompletions] = useState({})
  const [flies, setFlies] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('lough')
  const [view, setView] = useState('my_prep') // 'my_prep' | 'team_overview'
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add item form state
  const [newText, setNewText] = useState('')
  const [newFlyId, setNewFlyId] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newBead, setNewBead] = useState('None')
  const [newQty, setNewQty] = useState('')
  const [newIsPersonal, setNewIsPersonal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [itemsRes, completionsRes, fliesRes, profilesRes] = await Promise.all([
      supabase.from('prep_items').select('*, flies(name, photo_url)').order('created_at'),
      supabase.from('prep_completions').select('*'),
      supabase.from('flies').select('*').order('name'),
      supabase.from('profiles').select('id, name, initials, team').order('name'),
    ])
    setItems(itemsRes.data || [])
    // Build completion map: { item_id: { user_id: true } }
    const compMap = {}
    ;(completionsRes.data || []).forEach(c => {
      if (!compMap[c.item_id]) compMap[c.item_id] = {}
      compMap[c.item_id][c.user_id] = true
    })
    setCompletions(compMap)
    setFlies(fliesRes.data || [])
    setProfiles(profilesRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function toggleComplete(itemId) {
    const done = completions[itemId]?.[profile.id]
    if (done) {
      await supabase.from('prep_completions').delete().eq('item_id', itemId).eq('user_id', profile.id)
      setCompletions(prev => {
        const next = { ...prev, [itemId]: { ...prev[itemId] } }
        delete next[itemId][profile.id]
        return next
      })
    } else {
      await supabase.from('prep_completions').insert({ item_id: itemId, user_id: profile.id })
      setCompletions(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [profile.id]: true } }))
    }
  }

  async function addItem() {
    if (!newText && !newFlyId) return
    setSaving(true)
    const fly = flies.find(f => f.id === newFlyId)
    const text = newText || (fly ? `${fly.name}${newSize ? ` #${newSize}` : ''}${newBead && newBead !== 'None' ? ` · ${newBead} bead` : ''}${newQty ? ` · Qty: ${newQty}` : ''}` : '')
    await supabase.from('prep_items').insert({
      section: activeSection,
      text,
      fly_id: newFlyId || null,
      fly_size: newSize || null,
      bead_colour: newBead !== 'None' ? newBead : null,
      suggested_qty: newQty ? parseInt(newQty) : null,
      is_team_item: !newIsPersonal && isCoach,
      created_by: profile.id,
      personal_for: newIsPersonal ? profile.id : null,
    })
    setNewText(''); setNewFlyId(''); setNewSize(''); setNewBead('None'); setNewQty(''); setNewIsPersonal(false)
    setShowAddForm(false)
    setSaving(false)
    fetchData()
  }

  async function deleteItem(id) {
    await supabase.from('prep_items').delete().eq('id', id)
    fetchData()
  }

  // Filter items for current section — team items + this user's personal items
  const sectionItems = items.filter(i =>
    i.section === activeSection &&
    (i.is_team_item || i.personal_for === profile.id)
  )

  const teamItems = sectionItems.filter(i => i.is_team_item)
  const personalItems = sectionItems.filter(i => !i.is_team_item)

  // My completion %
  const totalItems = items.filter(i => i.is_team_item || i.personal_for === profile.id)
  const myCompleted = totalItems.filter(i => completions[i.id]?.[profile.id]).length
  const myPct = totalItems.length ? Math.round((myCompleted / totalItems.length) * 100) : 0

  function avatarColor(name) {
    const colors = ['rgba(29,158,117,0.2)', 'rgba(55,138,221,0.2)', 'rgba(239,159,39,0.2)', 'rgba(212,83,126,0.2)', 'rgba(127,119,221,0.2)']
    const textColors = ['#5DCAA5', '#85B7EB', '#FAC775', '#ED93B1', '#AFA9EC']
    const i = (name || '').charCodeAt(0) % colors.length
    return { bg: colors[i], color: textColors[i] }
  }

  if (loading) return <div className="screen active"><div className="spinner" /></div>

  return (
    <div className="screen active">
      {/* Header with progress */}
      <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'rgba(232,240,240,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Prep Checklist</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ fontSize: 13, color: '#e8f0f0' }}>{profile.name}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: myPct === 100 ? '#5DCAA5' : 'var(--gold)' }}>{myPct}%</div>
        </div>
        <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${myPct}%`, background: myPct === 100 ? '#5DCAA5' : 'var(--gold)', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* View toggle for coaches */}
      {isCoach && (
        <div className="segment" style={{ marginBottom: 14 }}>
          <button className={`seg-btn ${view === 'my_prep' ? 'active' : ''}`} onClick={() => setView('my_prep')}>My prep</button>
          <button className={`seg-btn ${view === 'team_overview' ? 'active' : ''}`} onClick={() => setView('team_overview')}>Team overview</button>
        </div>
      )}

      {/* TEAM OVERVIEW */}
      {view === 'team_overview' && isCoach && (
        <>
          <div className="section-label">Team completion</div>
          {profiles.map(p => {
            const userTotal = items.filter(i => i.is_team_item || i.personal_for === p.id)
            const userDone = userTotal.filter(i => completions[i.id]?.[p.id]).length
            const pct = userTotal.length ? Math.round((userDone / userTotal.length) * 100) : 0
            const col = avatarColor(p.name)
            return (
              <div key={p.id} className="card" style={{ padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: col.bg, color: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {p.initials || p.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#5DCAA5' : 'var(--gold)' }}>{pct}%</div>
                    </div>
                    <div style={{ height: 3, background: 'var(--bg-input)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#5DCAA5' : 'var(--gold)', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{userDone}/{userTotal.length} items</div>
                  </div>
                </div>
                {/* Section breakdown */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {SECTIONS.map(s => {
                    const sItems = items.filter(i => i.section === s.id && (i.is_team_item || i.personal_for === p.id))
                    const sDone = sItems.filter(i => completions[i.id]?.[p.id]).length
                    if (sItems.length === 0) return null
                    return (
                      <div key={s.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sDone === sItems.length ? 'rgba(29,158,117,0.15)' : 'var(--bg-input)', color: sDone === sItems.length ? '#5DCAA5' : 'var(--text-muted)', border: `0.5px solid ${sDone === sItems.length ? 'rgba(29,158,117,0.3)' : 'var(--border)'}` }}>
                        {s.icon} {sDone}/{sItems.length}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* MY PREP */}
      {view === 'my_prep' && (
        <>
          {/* Section tabs */}
          <div className="sector-scroll" style={{ marginBottom: 14 }}>
            {SECTIONS.map(s => {
              const sItems = items.filter(i => i.section === s.id && (i.is_team_item || i.personal_for === profile.id))
              const sDone = sItems.filter(i => completions[i.id]?.[profile.id]).length
              return (
                <div key={s.id} className={`sector-pill ${activeSection === s.id ? 'active' : ''}`} onClick={() => { setActiveSection(s.id); setShowAddForm(false) }}>
                  {s.icon} {s.label.split(' ')[0]}
                  {sItems.length > 0 && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.8 }}>{sDone}/{sItems.length}</span>}
                </div>
              )
            })}
          </div>

          {/* Add item button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="section-label" style={{ marginBottom: 0 }}>{SECTIONS.find(s => s.id === activeSection)?.label}</div>
            <button onClick={() => setShowAddForm(v => !v)} style={{ fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              {showAddForm ? 'Cancel' : '+ Add item'}
            </button>
          </div>

          {/* Add item form */}
          {showAddForm && (
            <div className="card" style={{ marginBottom: 14 }}>
              {activeSection === 'fly_tying' ? (
                <>
                  <label style={{ marginTop: 0 }}>Select fly from flybox</label>
                  <select value={newFlyId} onChange={e => setNewFlyId(e.target.value)}>
                    <option value="">Select fly...</option>
                    {flies.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <label>Or enter fly name manually</label>
                  <input type="text" placeholder="e.g. UV Hare's Ear" value={newText} onChange={e => setNewText(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label>Hook size</label>
                      <input type="text" placeholder="e.g. 12" value={newSize} onChange={e => setNewSize(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Qty</label>
                      <input type="number" placeholder="6" value={newQty} onChange={e => setNewQty(e.target.value)} />
                    </div>
                  </div>
                  <label>Bead colour</label>
                  <select value={newBead} onChange={e => setNewBead(e.target.value)}>
                    {BEAD_COLOURS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <label style={{ marginTop: 0 }}>Item</label>
                  <input type="text" placeholder="Add prep item..." value={newText} onChange={e => setNewText(e.target.value)} />
                </>
              )}
              {!isCoach && (
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Added as personal item</div>
              )}
              {isCoach && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input type="checkbox" id="personal-check" checked={newIsPersonal} onChange={e => setNewIsPersonal(e.target.checked)} />
                  <label htmlFor="personal-check" style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Personal item (only visible to me)</label>
                </div>
              )}
              <button className="btn" onClick={addItem} disabled={saving || (!newText && !newFlyId)}>
                {saving ? 'Adding...' : 'Add to checklist'}
              </button>
            </div>
          )}

          {/* Team items */}
          {teamItems.length > 0 && (
            <>
              {personalItems.length > 0 && <div className="section-label">Team requirements</div>}
              {teamItems.map(item => {
                const done = completions[item.id]?.[profile.id]
                const fly = item.flies
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <button onClick={() => toggleComplete(item.id)} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${done ? '#5DCAA5' : 'var(--border)'}`, background: done ? '#5DCAA5' : 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                      {done ? '✓' : ''}
                    </button>
                    <div style={{ flex: 1 }}>
                      {fly?.photo_url && (
                        <img src={fly.photo_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, marginBottom: 4 }} />
                      )}
                      <div style={{ fontSize: 14, color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{item.text}</div>
                      {item.suggested_qty && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>Qty: {item.suggested_qty}</div>}
                    </div>
                    {isCoach && (
                      <button onClick={() => deleteItem(item.id)} style={{ fontSize: 11, color: '#F09595', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Personal items */}
          {personalItems.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 16 }}>My personal items</div>
              {personalItems.map(item => {
                const done = completions[item.id]?.[profile.id]
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <button onClick={() => toggleComplete(item.id)} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${done ? '#5DCAA5' : 'var(--border)'}`, background: done ? '#5DCAA5' : 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                      {done ? '✓' : ''}
                    </button>
                    <div style={{ flex: 1, fontSize: 14, color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{item.text}</div>
                    <button onClick={() => deleteItem(item.id)} style={{ fontSize: 11, color: '#F09595', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                  </div>
                )
              })}
            </>
          )}

          {teamItems.length === 0 && personalItems.length === 0 && (
            <div className="empty-state">
              <div className="icon">{SECTIONS.find(s => s.id === activeSection)?.icon}</div>
              <p>No items yet.<br />{isCoach ? 'Add team requirements above.' : 'Coach will add items here.'}</p>
            </div>
          )}

          <div style={{ height: 20 }} />
        </>
      )}
    </div>
  )
}
