import { useState, useEffect } from 'react'
import { supabase, SECTORS } from '../lib/supabase'

function ChipGroup({ options, selected, onChange }) {
  function toggle(opt) {
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt))
    else onChange([...selected, opt])
  }
  return (
    <div className="chip-grid">
      {options.map(opt => (
        <div key={opt} className={`chip ${selected.includes(opt) ? 'active' : ''}`} onClick={() => toggle(opt)}>
          {opt}
        </div>
      ))}
    </div>
  )
}

export default function PracticeWaters({ profile, showToast }) {
  const [waters, setWaters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [waterType, setWaterType] = useState('lough')
  const [compSectors, setCompSectors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('lough')
  const [editSectors, setEditSectors] = useState([])

  const isCoach = ['coach', 'manager'].includes(profile?.role)

  async function fetchWaters() {
    const { data } = await supabase.from('practice_waters').select('*, profiles(name)').order('name')
    setWaters(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchWaters() }, [])

  async function addWater() {
    if (!name || compSectors.length === 0) return
    setSubmitting(true)
    await supabase.from('practice_waters').insert({
      name,
      water_type: waterType,
      comp_sectors: compSectors,
      created_by: profile.id,
    })
    setName(''); setCompSectors([]); setWaterType('lough')
    setShowAdd(false)
    await fetchWaters()
    setSubmitting(false)
    showToast('Practice water added')
  }

  async function saveEdit(id) {
    await supabase.from('practice_waters').update({
      name: editName,
      water_type: editType,
      comp_sectors: editSectors,
    }).eq('id', id)
    setEditingId(null)
    await fetchWaters()
    showToast('Updated')
  }

  async function deleteWater(id) {
    await supabase.from('practice_waters').delete().eq('id', id)
    await fetchWaters()
    showToast('Removed')
  }

  function startEdit(w) {
    setEditingId(w.id)
    setEditName(w.name)
    setEditType(w.water_type)
    setEditSectors(w.comp_sectors || [])
  }

  return (
    <div className="screen active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Practice waters</div>
        {isCoach && (
          <button style={{ fontSize: 13, color: 'var(--green-mid)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => setShowAdd(v => !v)}>
            {showAdd ? 'Cancel' : '+ Add water'}
          </button>
        )}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
        Map practice waters to competition sectors. Anglers select their practice water when logging — the comp sectors populate automatically.
      </div>

      {showAdd && isCoach && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={{ marginTop: 0 }}>Practice water name</label>
          <input type="text" placeholder="e.g. Lough Fern" value={name} onChange={e => setName(e.target.value)} />

          <label>Water type</label>
          <div className="segment">
            <button className={`seg-btn ${waterType === 'lough' ? 'active' : ''}`} onClick={() => setWaterType('lough')}>Lough / Stillwater</button>
            <button className={`seg-btn ${waterType === 'river' ? 'active' : ''}`} onClick={() => setWaterType('river')}>River</button>
          </div>

          <label>Maps to comp sectors</label>
          <ChipGroup options={SECTORS} selected={compSectors} onChange={setCompSectors} />
          {compSectors.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Select at least one comp sector</div>
          )}

          <button className="btn" onClick={addWater} disabled={submitting || !name || compSectors.length === 0}>
            {submitting ? 'Adding...' : 'Add practice water'}
          </button>
        </div>
      )}

      {loading && <div className="spinner" />}

      {!loading && waters.length === 0 && (
        <div className="empty-state">
          <div className="icon">🗺️</div>
          <p>No practice waters set up yet.<br />{isCoach ? 'Add your first one above.' : 'Ask a coach to add practice waters.'}</p>
        </div>
      )}

      {waters.map(w => (
        <div className="card" key={w.id}>
          {editingId === w.id ? (
            <>
              <label style={{ marginTop: 0 }}>Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
              <label>Water type</label>
              <div className="segment">
                <button className={`seg-btn ${editType === 'lough' ? 'active' : ''}`} onClick={() => setEditType('lough')}>Lough</button>
                <button className={`seg-btn ${editType === 'river' ? 'active' : ''}`} onClick={() => setEditType('river')}>River</button>
              </div>
              <label>Maps to comp sectors</label>
              <ChipGroup options={SECTORS} selected={editSectors} onChange={setEditSectors} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ marginTop: 12 }} onClick={() => saveEdit(w.id)}>Save</button>
                <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {w.water_type === 'lough' ? 'Lough / Stillwater' : 'River'}
                  </div>
                </div>
                {isCoach && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => startEdit(w)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteWater(w.id)} style={{ fontSize: 12, color: '#F09595', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Feeds into</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(w.comp_sectors || []).map(s => (
                    <span key={s} className="feed-tag" style={{ color: 'var(--gold)', borderColor: 'rgba(255,179,2,0.3)' }}>{s}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  )
}
