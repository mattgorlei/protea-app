import { useState, useEffect } from 'react'
import { supabase, SECTORS } from '../lib/supabase'

function FlyCard({ fly, catchCount, showToast, onUpdated, profileId, isCoach }) {
  const [mode, setMode] = useState('view') // 'view' | 'photo' | 'edit'
  const [editPhoto, setEditPhoto] = useState(null)
  const [editPreview, setEditPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState(fly.name)
  const [editSize, setEditSize] = useState(fly.size)
  const [editSector, setEditSector] = useState(fly.sector || '')
  const [reactions, setReactions] = useState({})
  const [myReaction, setMyReaction] = useState(null)

  useEffect(() => {
    supabase.from('fly_reactions').select('emoji, user_id').eq('fly_id', fly.id).then(({ data }) => {
      const counts = {}
      ;(data || []).forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1 })
      setReactions(counts)
      const mine = (data || []).find(r => r.user_id === profileId)
      if (mine) setMyReaction(mine.emoji)
    })
  }, [fly.id, profileId])

  async function react(emoji) {
    if (myReaction === emoji) {
      await supabase.from('fly_reactions').delete().eq('fly_id', fly.id).eq('user_id', profileId)
      setReactions(prev => ({ ...prev, [emoji]: Math.max((prev[emoji] || 1) - 1, 0) }))
      setMyReaction(null)
    } else {
      if (myReaction) {
        await supabase.from('fly_reactions').delete().eq('fly_id', fly.id).eq('user_id', profileId)
        setReactions(prev => ({ ...prev, [myReaction]: Math.max((prev[myReaction] || 1) - 1, 0) }))
      }
      await supabase.from('fly_reactions').insert({ fly_id: fly.id, user_id: profileId, emoji })
      setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }))
      setMyReaction(emoji)
    }
  }

  async function savePhoto() {
    if (!editPhoto) return
    setSaving(true)
    const ext = editPhoto.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('fly-photos').upload(path, editPhoto)
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('fly-photos').getPublicUrl(path)
      const photoUrl = urlData.publicUrl + '?t=' + Date.now()
      const { error: dbError } = await supabase.from('flies').update({ photo_url: photoUrl }).eq('id', fly.id)
      if (!dbError) { showToast('Photo updated'); onUpdated && onUpdated() }
      else showToast('Error: ' + dbError.message)
    } else showToast('Upload failed: ' + uploadError.message)
    setSaving(false)
    setMode('view'); setEditPhoto(null); setEditPreview(null)
  }

  async function saveEdit() {
    setSaving(true)
    await supabase.from('flies').update({
      name: editName,
      size: editSize,
      sector: editSector || null,
    }).eq('id', fly.id)
    setSaving(false)
    setMode('view')
    onUpdated && onUpdated()
    showToast('Fly updated')
  }

  async function deleteFly() {
    if (!window.confirm(`Delete "${fly.name}"?`)) return
    await supabase.from('flies').delete().eq('id', fly.id)
    onUpdated && onUpdated()
    showToast('Fly removed')
  }

  const displayPhoto = editPreview || fly.photo_url

  return (
    <div className="fly-card">
      <div className="fly-img">
        {displayPhoto
          ? <img src={displayPhoto} alt={fly.name} />
          : <span style={{ fontSize: 28 }}>🪰</span>
        }
      </div>

      {mode === 'edit' ? (
        <>
          <label style={{ marginTop: 6, fontSize: 11 }}>Name</label>
          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: 13, padding: '5px 8px' }} />
          <label style={{ fontSize: 11 }}>Size</label>
          <input type="text" value={editSize} onChange={e => setEditSize(e.target.value)} style={{ fontSize: 13, padding: '5px 8px' }} />
          <label style={{ fontSize: 11 }}>Sector</label>
          <select value={editSector} onChange={e => setEditSector(e.target.value)} style={{ fontSize: 13, padding: '5px 8px' }}>
            <option value="">All loughs</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <button className="btn" style={{ marginTop: 0, flex: 1, padding: '6px', fontSize: 11 }} onClick={saveEdit} disabled={saving}>{saving ? '...' : 'Save'}</button>
            <button className="btn btn-secondary" style={{ marginTop: 0, flex: 1, padding: '6px', fontSize: 11 }} onClick={() => setMode('view')}>Cancel</button>
          </div>
        </>
      ) : mode === 'photo' ? (
        <>
          {editPreview && <img src={editPreview} alt="preview" style={{ width: '100%', borderRadius: 6, maxHeight: 80, objectFit: 'cover', marginTop: 6 }} />}
          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
            <label htmlFor={'edit-cam-' + fly.id} style={{ flex: 1, margin: 0 }}>
              <div className="upload-box" style={{ padding: '6px', textAlign: 'center', fontSize: 11, cursor: 'pointer' }}>📷</div>
            </label>
            <label htmlFor={'edit-gal-' + fly.id} style={{ flex: 1, margin: 0 }}>
              <div className="upload-box" style={{ padding: '6px', textAlign: 'center', fontSize: 11, cursor: 'pointer' }}>🖼️</div>
            </label>
          </div>
          <input id={'edit-cam-' + fly.id} type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if(f){setEditPhoto(f);setEditPreview(URL.createObjectURL(f))} }} style={{ display: 'none' }} />
          <input id={'edit-gal-' + fly.id} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){setEditPhoto(f);setEditPreview(URL.createObjectURL(f))} }} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
            <button className="btn" style={{ marginTop: 0, flex: 1, padding: '6px', fontSize: 11 }} onClick={savePhoto} disabled={saving || !editPhoto}>{saving ? '...' : 'Save'}</button>
            <button className="btn btn-secondary" style={{ marginTop: 0, flex: 1, padding: '6px', fontSize: 11 }} onClick={() => { setMode('view'); setEditPhoto(null); setEditPreview(null) }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="fly-name">{fly.name}</div>
          <div className="fly-meta">Size {fly.size}</div>
          {fly.sector && <div className="fly-meta">{fly.sector}</div>}
          <div className="fly-meta">Added by {fly.profiles?.name || 'team'}</div>
          <div className="fly-catches">{catchCount ? `${catchCount} fish caught` : 'No catches yet'}</div>

          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {['🔥', '👌', '❌'].map(emoji => (
              <button key={emoji} onClick={() => react(emoji)} style={{ padding: '3px 7px', fontSize: 12, borderRadius: 99, border: `0.5px solid ${myReaction === emoji ? 'var(--gold)' : 'var(--border)'}`, background: myReaction === emoji ? 'rgba(255,179,2,0.12)' : 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {emoji}{reactions[emoji] ? ` ${reactions[emoji]}` : ''}
              </button>
            ))}
          </div>

          {isCoach ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => setMode('edit')} style={{ flex: 1, fontSize: 11, color: 'var(--gold)', background: 'none', border: '0.5px solid rgba(255,179,2,0.3)', borderRadius: 6, padding: '5px', cursor: 'pointer' }}>✏️ Edit</button>
              <button onClick={() => setMode('photo')} style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 6, padding: '5px', cursor: 'pointer' }}>📷 Photo</button>
              <button onClick={deleteFly} style={{ fontSize: 11, color: '#F09595', background: 'none', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>🗑️</button>
            </div>
          ) : (
            <button onClick={() => setMode('photo')} style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Update photo</button>
          )}
        </>
      )}
    </div>
  )
}

export default function Flybox({ profile, showToast }) {
  const [flies, setFlies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [sector, setSector] = useState('All loughs')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [catchCounts, setCatchCounts] = useState({})
  const [sectorFilter, setSectorFilter] = useState('All')

  const isCoach = ['coach', 'manager'].includes(profile?.role?.toLowerCase())

  async function fetchFlies() {
    const { data } = await supabase.from('flies').select('*, profiles(name)').order('created_at', { ascending: false })
    setFlies(data || [])
    setLoading(false)
  }

  async function fetchCatchCounts() {
    const { data } = await supabase.from('entries').select('fly_id').not('fly_id', 'is', null)
    const counts = {}
    ;(data || []).forEach(e => { counts[e.fly_id] = (counts[e.fly_id] || 0) + 1 })
    setCatchCounts(counts)
  }

  useEffect(() => {
    fetchFlies()
    fetchCatchCounts()
    const channel = supabase.channel('flies-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flies' }, fetchFlies)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'flies' }, fetchFlies)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'flies' }, fetchFlies)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file); setPhotoPreview(URL.createObjectURL(file))
  }

  async function submitFly() {
    if (!name || !size) return
    setSubmitting(true)
    let photoUrl = null
    if (photo) {
      const ext = photo.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('fly-photos').upload(path, photo)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('fly-photos').getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }
    }
    await supabase.from('flies').insert({ name, size, sector: sector === 'All loughs' ? null : sector, photo_url: photoUrl, added_by: profile.id })
    setName(''); setSize(''); setSector('All loughs'); setPhoto(null); setPhotoPreview(null)
    setShowAdd(false)
    await fetchFlies(); await fetchCatchCounts()
    setSubmitting(false)
    showToast('Fly added to flybox')
  }

  const sectorOptions = ['All loughs', ...SECTORS]
  const sectorColors = {
    'Lough Craghy':   { bg: 'rgba(55,138,221,0.15)', text: '#85B7EB' },
    'Lough Anure':    { bg: 'rgba(29,158,117,0.15)', text: '#5DCAA5' },
    'Lough Deele':    { bg: 'rgba(127,119,221,0.15)', text: '#AFA9EC' },
    'River Dennett':  { bg: 'rgba(239,159,39,0.15)', text: '#FAC775' },
    'River Quiggery': { bg: 'rgba(212,83,126,0.15)', text: '#ED93B1' },
  }
  const ALL_SECTORS = ['All', ...SECTORS]
  const sectorOrder = ['Lough Craghy', 'Lough Anure', 'Lough Deele', 'River Dennett', 'River Quiggery', null]
  const filteredFlies = sectorFilter === 'All' ? flies : flies.filter(f => (f.sector || 'General') === sectorFilter || (!f.sector && sectorFilter === 'General'))
  const groupedFlies = sectorOrder.reduce((acc, s) => {
    const group = filteredFlies.filter(f => (s === null ? !f.sector : f.sector === s))
    if (group.length) acc.push({ sector: s || 'General', flies: group })
    return acc
  }, [])

  return (
    <div className="screen active" id="screen-flybox">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Team flybox · {flies.length} flies</div>
        <button style={{ fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }} onClick={() => setShowAdd(v => !v)}>
          {showAdd ? 'Cancel' : '+ Add fly'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={{ marginTop: 0 }}>Fly name</label>
          <input type="text" placeholder="e.g. Claret Dabbler" value={name} onChange={e => setName(e.target.value)} />
          <label>Size</label>
          <input type="text" placeholder="e.g. 12" value={size} onChange={e => setSize(e.target.value)} />
          <label>Applicable sector</label>
          <select value={sector} onChange={e => setSector(e.target.value)}>
            {sectorOptions.map(s => <option key={s}>{s}</option>)}
          </select>
          <label>Photo</label>
          {photoPreview && <img src={photoPreview} alt="fly" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
          <div style={{ display: 'flex', gap: 6 }}>
            <label htmlFor="fly-photo-camera" style={{ flex: 1, margin: 0 }}>
              <div className="upload-box" style={{ cursor: 'pointer', padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
                <div style={{ fontSize: 12 }}>Camera</div>
              </div>
            </label>
            <label htmlFor="fly-photo-gallery" style={{ flex: 1, margin: 0 }}>
              <div className="upload-box" style={{ cursor: 'pointer', padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🖼️</div>
                <div style={{ fontSize: 12 }}>Gallery</div>
              </div>
            </label>
          </div>
          <input id="fly-photo-camera" type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: 'none' }} />
          <input id="fly-photo-gallery" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          <button className="btn" onClick={submitFly} disabled={submitting || !name || !size}>{submitting ? 'Adding...' : 'Add to flybox'}</button>
        </div>
      )}

      {loading && <div className="spinner" />}
      {!loading && flies.length === 0 && (
        <div className="empty-state"><div className="icon">🪰</div><p>Flybox is empty.<br />Add flies to get started.</p></div>
      )}

      <div className="sector-scroll" style={{ marginBottom: 14 }}>
        {ALL_SECTORS.map(s => (
          <div key={s} className={"sector-pill " + (sectorFilter === s ? 'active' : '')} onClick={() => setSectorFilter(s)}>{s}</div>
        ))}
      </div>

      {groupedFlies.map(({ sector: grpSector, flies: grpFlies }) => (
        <div key={grpSector}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: (sectorColors[grpSector] || {}).bg || 'var(--bg-input)', color: (sectorColors[grpSector] || {}).text || 'var(--text-secondary)' }}>{grpSector}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{grpFlies.length} {grpFlies.length === 1 ? 'fly' : 'flies'}</div>
          </div>
          <div className="fly-grid" style={{ marginBottom: 16 }}>
            {grpFlies.map(fly => (
              <FlyCard key={fly.id} fly={fly} catchCount={catchCounts[fly.id]} showToast={showToast} onUpdated={fetchFlies} profileId={profile?.id} isCoach={isCoach} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  )
}
