import { useState, useEffect } from 'react'
import { supabase, SECTORS, LOUGH_SECTORS, CONDITIONS, LINES, LOUGH_METHODS, RIVER_METHODS, RETRIEVE_SPEEDS, RETRIEVE_ACTIVATIONS, PLACING_OPTIONS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function ChipGroup({ options, selected, onChange, multi = true }) {
  function toggle(opt) {
    if (!multi) return onChange(opt)
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt))
    else onChange([...selected, opt])
  }
  function isActive(opt) {
    if (multi) return Array.isArray(selected) && selected.includes(opt)
    return selected === opt
  }
  return (
    <div className="chip-grid">
      {options.map(opt => (
        <div
          key={opt}
          className={`chip ${isActive(opt) ? 'active' : ''}`}
          onClick={() => toggle(opt)}
        >
          {opt}
        </div>
      ))}
    </div>
  )
}

function ConfidenceRating({ value, onChange }) {
  return (
    <div className="conf-row">
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className={`conf-btn ${value === n ? 'active' : ''}`} onClick={() => onChange(n)}>{n}</div>
      ))}
    </div>
  )
}

export default function Log({ profile, showToast }) {
  const [mode, setMode] = useState('practice')
  const [waterType, setWaterType] = useState('lough')
  const [entryType, setEntryType] = useState('fish_feedback')
  const [sectors, setSectors] = useState([])

  const LOUGH_SECTOR_NAMES = ['Lough Craghy', 'Lough Anure', 'Lough Deele']

  function handleSectorChange(newSectors) {
    if (newSectors.length === 0) return
    setSectors(newSectors)
  }

  // If 2+ loughs selected, primary becomes 'All Loughs', else first selected
  const selectedLoughs = sectors.filter(s => LOUGH_SECTOR_NAMES.includes(s))
  const sector = selectedLoughs.length >= 2 ? 'All Loughs' : (sectors[0] || SECTORS[0])
  const [practiceWaterName, setPracticeWaterName] = useState('')
  const [conditions, setConditions] = useState('')
  const [conditionsOther, setConditionsOther] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sessionTime, setSessionTime] = useState(() => {
    const now = new Date()
    return now.toTimeString().slice(0, 5) // HH:MM
  })

  // Inline quick-add fly
  const [showAddFly, setShowAddFly] = useState(false)
  const [newFlyName, setNewFlyName] = useState('')
  const [newFlySize, setNewFlySize] = useState('')
  const [addingFly, setAddingFly] = useState(false)
  const [newFlyPhoto, setNewFlyPhoto] = useState(null)
  const [newFlyPreview, setNewFlyPreview] = useState(null)

  // Fish feedback — lough
  const [lineUsed, setLineUsed] = useState('')
  const [method, setMethod] = useState('')
  const [flyId, setFlyId] = useState('')
  const [retrieveSpeed, setRetrieveSpeed] = useState('')
  const [retrieveActivations, setRetrieveActivations] = useState([])
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Fish feedback — river
  const [riverMethod, setRiverMethod] = useState('')

  // Observation
  const [obsLearning, setObsLearning] = useState('')
  const [obsImportance, setObsImportance] = useState('')
  const [obsCompSectors, setObsCompSectors] = useState([SECTORS[0]])
  const [obsOther, setObsOther] = useState('')

  // End of day
  const [eodPracticedFor, setEodPracticedFor] = useState('')
  const [eodConfidence, setEodConfidence] = useState(3)
  const [eodFeedback, setEodFeedback] = useState('')
  const [eodKeyLearnings, setEodKeyLearnings] = useState(['', '', ''])
  const [eodChallenge, setEodChallenge] = useState('')
  const [eodTopFly, setEodTopFly] = useState('')

  // Competition
  const [compBeat, setCompBeat] = useState('')
  const [compPartner, setCompPartner] = useState('')
  const [compFishCount, setCompFishCount] = useState('')
  const [compPlacing, setCompPlacing] = useState('')
  const [compFlyIds, setCompFlyIds] = useState([])
  const [compMethodsFished, setCompMethodsFished] = useState([])
  const [compBestMethod, setCompBestMethod] = useState('')
  const [compTechDesc, setCompTechDesc] = useState('')
  const [compBoatNotes, setCompBoatNotes] = useState('')
  const [compSuggestion, setCompSuggestion] = useState('')

  const [flies, setFlies] = useState([])
  const [practiceWaters, setPracticeWaters] = useState([])
  const [selectedWaterId, setSelectedWaterId] = useState('')

  // Derived: selected practice water object
  const selectedWater = practiceWaters.find(w => w.id === selectedWaterId)
  // Auto-resolve comp sectors from practice water mapping
  const resolvedSectors = selectedWater?.comp_sectors || sectors
  const resolvedSector = resolvedSectors.length >= 2 &&
    resolvedSectors.every(s => ['Lough Craghy','Lough Anure','Lough Deele'].includes(s))
    ? 'All Loughs'
    : resolvedSectors[0] || SECTORS[0]

  useEffect(() => {
    supabase.from('practice_waters').select('*').order('name').then(({ data }) => setPracticeWaters(data || []))
  }, [])

  async function fetchFlies() {
    const { data } = await supabase.from('flies').select('*').order('name')
    setFlies(data || [])
  }

  useEffect(() => { fetchFlies() }, [])

  async function quickAddFly() {
    if (!newFlyName || !newFlySize) return
    setAddingFly(true)
    let photoUrl = null
    if (newFlyPhoto) {
      const ext = newFlyPhoto.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('fly-photos').upload(path, newFlyPhoto)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('fly-photos').getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }
    }
    const { data } = await supabase.from('flies').insert({
      name: newFlyName,
      size: newFlySize,
      photo_url: photoUrl,
      added_by: profile.id,
    }).select().single()
    await fetchFlies()
    if (data) setFlyId(data.id)
    setNewFlyName(''); setNewFlySize(''); setNewFlyPhoto(null); setNewFlyPreview(null)
    setShowAddFly(false)
    setAddingFly(false)
    showToast('Fly added to flybox')
  }

  function reset() {
    setConditions(''); setConditionsOther(''); setPracticeWaterName(''); setSectors([]); setSelectedWaterId('')
    const now = new Date(); setSessionTime(now.toTimeString().slice(0, 5))
    setLineUsed(''); setMethod(''); setFlyId(''); setRetrieveSpeed('')
    setRetrieveActivations([]); setAdditionalNotes(''); setRiverMethod('')
    setObsLearning(''); setObsImportance(''); setObsOther('')
    setEodPracticedFor(''); setEodConfidence(3); setEodFeedback('')
    setEodKeyLearnings(['', '', '']); setEodChallenge(''); setEodTopFly('')
    setCompBeat(''); setCompPartner(''); setCompFishCount(''); setCompPlacing('')
    setCompFlyIds([]); setCompMethodsFished([]); setCompBestMethod('')
    setCompTechDesc(''); setCompBoatNotes(''); setCompSuggestion('')
  }

  async function submit() {
    setSubmitting(true)
    const base = {
      user_id: profile.id,
      entry_mode: mode,
      water_type: mode === 'competition' ? (LOUGH_SECTORS.includes(sector) ? 'lough' : 'river') : waterType,
      entry_type: mode === 'competition' ? 'competition' : entryType,
      sector: sectors[0],
      practice_water_name: practiceWaterName || null,
      applicable_sectors: sectors,
      conditions: conditions === 'Other' ? conditionsOther : conditions,
      session_time: sessionTime,
    }

    let extra = {}
    if (mode === 'competition') {
      extra = {
        comp_beat: compBeat,
        comp_boat_partner: compPartner,
        comp_fish_count: parseInt(compFishCount) || 0,
        comp_placing: compPlacing,
        comp_methods_fished: compMethodsFished,
        comp_most_effective_method: compBestMethod,
        comp_technique_description: compTechDesc,
        comp_boat_partner_notes: compBoatNotes,
        comp_suggestion_to_next: compSuggestion,
      }
    } else if (entryType === 'fish_feedback') {
      extra = waterType === 'lough' ? {
        line_used: lineUsed,
        method,
        fly_id: flyId || null,
        retrieve_speed: retrieveSpeed,
        retrieve_activations: retrieveActivations,
        additional_notes: additionalNotes,
      } : {
        river_method: riverMethod,
        fly_id: flyId || null,
        additional_notes: additionalNotes,
      }
    } else if (entryType === 'observation') {
      extra = { obs_learning: obsLearning, obs_importance: obsImportance, obs_comp_sector: obsCompSectors.join(', '), obs_other: obsOther }
    } else if (entryType === 'end_of_day') {
      extra = {
        eod_practiced_for: eodPracticedFor,
        eod_confidence: eodConfidence,
        eod_general_feedback: eodFeedback,
        eod_key_learnings: eodKeyLearnings.filter(Boolean),
        eod_biggest_challenge: eodChallenge,
      }
    }

    console.log('Submitting entry:', { ...base, ...extra })
    const { data, error } = await supabase.from('entries').insert({ ...base, ...extra }).select()
    console.log('Supabase response:', { data, error })
    setSubmitting(false)
    if (!error) {
      reset()
      showToast('Logged to team feed')
    } else {
      console.error('Insert error:', error)
      showToast('Error: ' + (error.message || 'Could not submit'))
    }
  }

  const isComp = mode === 'competition'

  return (
    <div className="screen active" id="screen-log">
      <div className="section-label">New entry</div>

      <div className="segment" style={{ marginBottom: 16 }}>
        <button className={`seg-btn ${mode === 'practice' ? 'active' : ''}`} onClick={() => setMode('practice')}>Practice</button>
        <button className={`seg-btn ${mode === 'competition' ? 'active' : ''}`} onClick={() => setMode('competition')}>Competition</button>
      </div>

      {!isComp && (
        <>
          <label>Water type</label>
          <div className="segment" style={{ marginBottom: 0 }}>
            <button className={`seg-btn ${waterType === 'lough' ? 'active' : ''}`} onClick={() => setWaterType('lough')}>Lough / Stillwater</button>
            <button className={`seg-btn ${waterType === 'river' ? 'active' : ''}`} onClick={() => setWaterType('river')}>River</button>
          </div>
        </>
      )}

      {!isComp ? (
        <>
          <label>Practice water</label>
          <select value={selectedWaterId} onChange={e => setSelectedWaterId(e.target.value)}>
            <option value="">Select practice water...</option>
            {practiceWaters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {selectedWater && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,179,2,0.08)', borderRadius: 'var(--radius-sm)', border: '0.5px solid rgba(255,179,2,0.25)' }}>
              <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Feeds into</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {resolvedSectors.map(s => <span key={s} className="feed-tag" style={{ color: 'var(--gold)', borderColor: 'rgba(255,179,2,0.3)' }}>{s}</span>)}
              </div>
            </div>
          )}
          {practiceWaters.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>No practice waters set up yet — ask a coach to add them in Settings.</div>
          )}
        </>
      ) : (
        <>
          <label>Competition sector</label>
          <select value={sectors[0] || ''} onChange={e => setSectors([e.target.value])}>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>
        </>
      )}



      <label>Time on water</label>
      <input type="time" value={sessionTime} onChange={e => setSessionTime(e.target.value)} />

      <label>Conditions</label>
      <select value={conditions} onChange={e => setConditions(e.target.value)}>
        <option value="">Select...</option>
        {CONDITIONS.map(c => <option key={c}>{c}</option>)}
      </select>
      {conditions === 'Other' && (
        <input type="text" placeholder="Describe conditions..." value={conditionsOther} onChange={e => setConditionsOther(e.target.value)} style={{ marginTop: 6 }} />
      )}

      {!isComp && (
        <>
          <div className="divider" />
          <div className="section-label">Entry type</div>

          <div className="type-option" style={entryType === 'fish_feedback' ? { borderColor: 'var(--green-mid)', background: 'rgba(29,158,117,0.1)' } : {}} onClick={() => setEntryType('fish_feedback')}>
            <div className="type-icon">🐟</div>
            <div><div className="type-title">Fish feedback</div><div className="type-sub">Caught, lost or missed</div></div>
          </div>
          <div className="type-option" style={entryType === 'observation' ? { borderColor: 'var(--green-mid)', background: 'rgba(29,158,117,0.1)' } : {}} onClick={() => setEntryType('observation')}>
            <div className="type-icon">👁</div>
            <div><div className="type-title">Observation</div><div className="type-sub">Something worth noting</div></div>
          </div>
          <div className="type-option" style={entryType === 'end_of_day' ? { borderColor: 'var(--green-mid)', background: 'rgba(29,158,117,0.1)' } : {}} onClick={() => setEntryType('end_of_day')}>
            <div className="type-icon">🌙</div>
            <div><div className="type-title">End of day</div><div className="type-sub">Full session summary</div></div>
          </div>
        </>
      )}

      <div className="divider" />

      {/* FISH FEEDBACK — LOUGH */}
      {!isComp && entryType === 'fish_feedback' && waterType === 'lough' && (
        <>
          <label>Line</label>
          <select value={lineUsed} onChange={e => setLineUsed(e.target.value)}>
            <option value="">Select...</option>
            {LINES.map(l => <option key={l}>{l}</option>)}
          </select>

          <label>Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)}>
            <option value="">Select...</option>
            {LOUGH_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>

          <label>Fly used</label>
          <select value={flyId} onChange={e => {
            if (e.target.value === '__add__') { setShowAddFly(true); return }
            setFlyId(e.target.value)
          }}>
            <option value="">Select fly...</option>
            {flies.map(f => <option key={f.id} value={f.id}>{f.name} #{f.size}</option>)}
            <option value="__add__">+ Add new fly...</option>
          </select>
          {showAddFly && (
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="text" placeholder="Fly name" value={newFlyName} onChange={e => setNewFlyName(e.target.value)} />
              <input type="text" placeholder="Size (e.g. 12)" value={newFlySize} onChange={e => setNewFlySize(e.target.value)} />
              {newFlyPreview && <img src={newFlyPreview} alt="fly" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />}
              <div style={{ display: 'flex', gap: 6 }}>
                <label htmlFor="quick-fly-camera" style={{ flex: 1, margin: 0 }}>
                  <div className="upload-box" style={{ cursor: 'pointer', padding: '8px', textAlign: 'center', fontSize: 12 }}>📷 Camera</div>
                </label>
                <label htmlFor="quick-fly-gallery" style={{ flex: 1, margin: 0 }}>
                  <div className="upload-box" style={{ cursor: 'pointer', padding: '8px', textAlign: 'center', fontSize: 12 }}>🖼️ Gallery</div>
                </label>
              </div>
              <input id="quick-fly-camera" type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if(f){setNewFlyPhoto(f);setNewFlyPreview(URL.createObjectURL(f))} }} style={{ display: 'none' }} />
              <input id="quick-fly-gallery" type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){setNewFlyPhoto(f);setNewFlyPreview(URL.createObjectURL(f))} }} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" style={{ marginTop: 0, flex: 1 }} onClick={quickAddFly} disabled={addingFly || !newFlyName || !newFlySize}>{addingFly ? 'Adding...' : 'Add fly'}</button>
                <button className="btn btn-secondary" style={{ marginTop: 0, flex: 1 }} onClick={() => setShowAddFly(false)}>Cancel</button>
              </div>
            </div>
          )}

          <label>Retrieve speed</label>
          <ChipGroup options={RETRIEVE_SPEEDS} selected={retrieveSpeed} onChange={setRetrieveSpeed} multi={false} />

          <label>Retrieve activation</label>
          <ChipGroup options={RETRIEVE_ACTIVATIONS} selected={retrieveActivations} onChange={setRetrieveActivations} />

          <label>Additional notes</label>
          <textarea rows={3} placeholder="Area, fly combos, follows, short eats, what induced the take..." value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} />
        </>
      )}

      {/* FISH FEEDBACK — RIVER */}
      {!isComp && entryType === 'fish_feedback' && waterType === 'river' && (
        <>
          <label>Method</label>
          <ChipGroup options={RIVER_METHODS} selected={riverMethod} onChange={setRiverMethod} multi={false} />

          <label>Fly used</label>
          <select value={flyId} onChange={e => {
            if (e.target.value === '__add__') { setShowAddFly(true); return }
            setFlyId(e.target.value)
          }}>
            <option value="">Select fly...</option>
            {flies.map(f => <option key={f.id} value={f.id}>{f.name} #{f.size}</option>)}
            <option value="__add__">+ Add new fly...</option>
          </select>
          {showAddFly && (
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="text" placeholder="Fly name" value={newFlyName} onChange={e => setNewFlyName(e.target.value)} />
              <input type="text" placeholder="Size (e.g. 12)" value={newFlySize} onChange={e => setNewFlySize(e.target.value)} />
              {newFlyPreview && <img src={newFlyPreview} alt="fly" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />}
              <div style={{ display: 'flex', gap: 6 }}>
                <label htmlFor="quick-fly-camera" style={{ flex: 1, margin: 0 }}>
                  <div className="upload-box" style={{ cursor: 'pointer', padding: '8px', textAlign: 'center', fontSize: 12 }}>📷 Camera</div>
                </label>
                <label htmlFor="quick-fly-gallery" style={{ flex: 1, margin: 0 }}>
                  <div className="upload-box" style={{ cursor: 'pointer', padding: '8px', textAlign: 'center', fontSize: 12 }}>🖼️ Gallery</div>
                </label>
              </div>
              <input id="quick-fly-camera" type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if(f){setNewFlyPhoto(f);setNewFlyPreview(URL.createObjectURL(f))} }} style={{ display: 'none' }} />
              <input id="quick-fly-gallery" type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){setNewFlyPhoto(f);setNewFlyPreview(URL.createObjectURL(f))} }} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" style={{ marginTop: 0, flex: 1 }} onClick={quickAddFly} disabled={addingFly || !newFlyName || !newFlySize}>{addingFly ? 'Adding...' : 'Add fly'}</button>
                <button className="btn btn-secondary" style={{ marginTop: 0, flex: 1 }} onClick={() => setShowAddFly(false)}>Cancel</button>
              </div>
            </div>
          )}

          <label>Additional notes</label>
          <textarea rows={3} placeholder="Water type, depth, drift, anything specific..." value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} />
        </>
      )}

      {/* OBSERVATION */}
      {!isComp && entryType === 'observation' && (
        <>
          <label>What did you learn?</label>
          <textarea rows={2} placeholder="Describe what you observed..." value={obsLearning} onChange={e => setObsLearning(e.target.value)} />

          <label>Why does this matter?</label>
          <textarea rows={2} placeholder="Why is this important?" value={obsImportance} onChange={e => setObsImportance(e.target.value)} />

          <label>Which comp sector(s) does this relate to?</label>
          <ChipGroup options={SECTORS} selected={obsCompSectors} onChange={setObsCompSectors} multi={true} />

          <label>Other notes</label>
          <textarea rows={2} placeholder="Anything else..." value={obsOther} onChange={e => setObsOther(e.target.value)} />
        </>
      )}

      {/* END OF DAY */}
      {!isComp && entryType === 'end_of_day' && (
        <>
          <label>What did you practice for today?</label>
          <textarea rows={2} placeholder="Your focus for the session..." value={eodPracticedFor} onChange={e => setEodPracticedFor(e.target.value)} />

          <label>Confidence for this sector</label>
          <ConfidenceRating value={eodConfidence} onChange={setEodConfidence} />

          <label>3 key things you learned</label>
          {[0, 1, 2].map(i => (
            <input
              key={i}
              type="text"
              placeholder={`${i + 1}.`}
              value={eodKeyLearnings[i]}
              onChange={e => setEodKeyLearnings(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
              style={{ marginBottom: 6 }}
            />
          ))}

          <label>Biggest challenge</label>
          <textarea rows={2} placeholder="What was hardest today?" value={eodChallenge} onChange={e => setEodChallenge(e.target.value)} />

          <label>General feedback</label>
          <textarea rows={3} placeholder="Anything else worth noting for the team..." value={eodFeedback} onChange={e => setEodFeedback(e.target.value)} />
        </>
      )}

      {/* COMPETITION FORM */}
      {isComp && (
        <>
          <label>Beat / Boat number</label>
          <input type="text" placeholder="e.g. Boat 3" value={compBeat} onChange={e => setCompBeat(e.target.value)} />

          <label>Boat partner</label>
          <input type="text" placeholder="Name" value={compPartner} onChange={e => setCompPartner(e.target.value)} />

          <label>Number of fish</label>
          <input type="number" placeholder="0" value={compFishCount} onChange={e => setCompFishCount(e.target.value)} />

          <label>Placing estimate</label>
          <ChipGroup options={PLACING_OPTIONS} selected={compPlacing} onChange={setCompPlacing} multi={false} />

          <label>Flies used</label>
          <div className="chip-grid">
            {flies.map(f => (
              <div
                key={f.id}
                className={`chip ${compFlyIds.includes(f.id) ? 'active' : ''}`}
                onClick={() => setCompFlyIds(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
              >
                {f.name} #{f.size}
              </div>
            ))}
          </div>

          <label>Methods fished</label>
          <ChipGroup
            options={LOUGH_SECTORS.includes(sector) ? LOUGH_METHODS : RIVER_METHODS}
            selected={compMethodsFished}
            onChange={setCompMethodsFished}
          />

          <label>Most effective method</label>
          <select value={compBestMethod} onChange={e => setCompBestMethod(e.target.value)}>
            <option value="">Select...</option>
            {(LOUGH_SECTORS.includes(sector) ? LOUGH_METHODS : RIVER_METHODS).map(m => <option key={m}>{m}</option>)}
          </select>

          <label>Technique description</label>
          <textarea rows={3} placeholder="What worked — retrieve style, depth, activation, anything specific..." value={compTechDesc} onChange={e => setCompTechDesc(e.target.value)} />

          <label>Boat partner — anything worth noting</label>
          <textarea rows={2} placeholder="Technique, fly, something they figured out..." value={compBoatNotes} onChange={e => setCompBoatNotes(e.target.value)} />

          <label>Suggestion to next teammate on this sector</label>
          <textarea rows={3} placeholder="Be specific — what would you tell them before they get on the water?" value={compSuggestion} onChange={e => setCompSuggestion(e.target.value)} />
        </>
      )}

      <button className="btn" onClick={submit} disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit to team feed'}
      </button>
      <div style={{ height: 20 }} />
    </div>
  )
}
