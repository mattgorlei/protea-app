import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PLAN_SECTIONS = [
  { key: 'water_profile',  label: 'Water Profile',     placeholder: 'Describe the water — character, conditions, species priority in order...' },
  { key: 'game_plan',      label: 'Game Plan',          placeholder: 'Percentage breakdown by technique and water type. What does the session look like overall...' },
  { key: 'starting_plan',  label: 'Starting Plan',      placeholder: 'First move off the boat. What do you put on, where do you go, what line...' },
  { key: 'techniques',     label: 'Techniques',         placeholder: 'Breakdown per method — retrieve, depth, activation, when to use each...' },
  { key: 'flies',          label: 'Flies',              placeholder: 'Bob, middle, point selections. Primary patterns, backup patterns, size and colour notes...' },
  { key: 'lines',          label: 'Lines',              placeholder: 'Priority order — when to use each line, depth targets, conditions they suit...' },
  { key: 'challenges',     label: 'Challenges & Notes', placeholder: 'What will be hard. Wind, wading, boat management, fish behaviour. Key reminders...' },
  { key: 'coach_notes',    label: 'Coach Notes',        placeholder: 'Pinned headline message to the team before this session...' },
]

function PlanSection({ section, value, isCoach, onSave }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value || '')

  useEffect(() => { setText(value || '') }, [value])

  async function save() {
    await onSave(section.key, text)
    setEditing(false)
  }

  const isEmpty = !value || value.trim() === ''

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: section.key === 'coach_notes' ? 'var(--gold)' : 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          {section.key === 'coach_notes' ? '📌 ' : ''}{section.label}
        </div>
        {isCoach && !editing && (
          <button onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {isEmpty ? '+ Add' : 'Edit'}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            rows={6}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={section.placeholder}
            style={{ width: '100%', background: 'var(--bg-input)', border: '0.5px solid var(--border-focus)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 14, padding: '10px 12px', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" style={{ marginTop: 0 }} onClick={save}>Save</button>
            <button className="btn btn-secondary" style={{ marginTop: 0 }} onClick={() => { setEditing(false); setText(value || '') }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{
          background: section.key === 'coach_notes' ? 'rgba(255,179,2,0.07)' : 'var(--bg-card)',
          border: `0.5px solid ${section.key === 'coach_notes' ? 'rgba(255,179,2,0.25)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontSize: 14,
          color: isEmpty ? 'var(--text-muted)' : 'var(--text)',
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          fontStyle: isEmpty ? 'italic' : 'normal',
        }}>
          {isEmpty ? section.placeholder.split('.')[0] + '...' : value}
        </div>
      )}
    </div>
  )
}

export default function SectorPlan({ sector, profile }) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const isCoach = ['coach', 'manager'].includes(profile?.role)

  const fetchPlan = useCallback(async () => {
    const { data } = await supabase.from('sector_plans_v2').select('*').eq('sector', sector).single()
    setPlan(data?.content || {})
    setLastUpdated(data?.updated_at || null)
    setLoading(false)
  }, [sector])

  useEffect(() => {
    setLoading(true)
    fetchPlan()
  }, [fetchPlan])

  async function saveSection(key, value) {
    const newContent = { ...(plan || {}), [key]: value }
    await supabase.from('sector_plans_v2').upsert({
      sector,
      content: newContent,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'sector' })
    setPlan(newContent)
    setLastUpdated(new Date().toISOString())
  }

  async function generatePlan() {
    setGenerating(true)

    // Fetch all entries for this sector
    const { data: entries } = await supabase
      .from('entries')
      .select('*, profiles(name, team)')
      .or(`sector.eq.${sector},applicable_sectors.cs.{"${sector}"}`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!entries || entries.length === 0) {
      setGenerating(false)
      return
    }

    // Build context summary for AI
    const fishFeedback = entries.filter(e => e.entry_type === 'fish_feedback')
    const observations = entries.filter(e => e.entry_type === 'observation')
    const eodEntries = entries.filter(e => e.entry_type === 'end_of_day')
    const compEntries = entries.filter(e => e.entry_type === 'competition')

    const context = `
You are a fly fishing coach assistant helping prepare a competition sector plan for the South African Protea Youth team at the World Youth Fly Fishing Championship in Donegal, Ireland.

Sector: ${sector}
Total entries: ${entries.length}
Fish feedback entries: ${fishFeedback.length}
Observations: ${observations.length}
End of day summaries: ${eodEntries.length}
Competition entries: ${compEntries.length}

FISH FEEDBACK SUMMARY:
${fishFeedback.map(e => `- ${e.profiles?.name} (${e.profiles?.team}): Line: ${e.line_used || 'N/A'}, Method: ${e.method || e.river_method || 'N/A'}, Retrieve: ${(e.retrieve_activations || []).join(', ') || 'N/A'}, Speed: ${e.retrieve_speed || 'N/A'}, Time: ${e.session_time || 'N/A'}. Notes: ${e.additional_notes || 'none'}`).join('\n')}

OBSERVATIONS:
${observations.map(e => `- ${e.profiles?.name}: ${e.obs_learning || ''} | Why important: ${e.obs_importance || ''}`).join('\n')}

END OF DAY SUMMARIES:
${eodEntries.map(e => `- ${e.profiles?.name} (${e.profiles?.team}): Confidence ${e.eod_confidence}/5. Practiced for: ${e.eod_practiced_for || 'N/A'}. Key learnings: ${(e.eod_key_learnings || []).join(', ')}. Challenge: ${e.eod_biggest_challenge || 'N/A'}. Feedback: ${e.eod_general_feedback || 'N/A'}`).join('\n')}

${compEntries.length > 0 ? `COMPETITION FEEDBACK:\n${compEntries.map(e => `- ${e.profiles?.name}: ${e.comp_fish_count || 0} fish, placing: ${e.comp_placing || 'N/A'}, best method: ${e.comp_most_effective_method || 'N/A'}. Technique: ${e.comp_technique_description || 'N/A'}. Suggestion to next: ${e.comp_suggestion_to_next || 'N/A'}`).join('\n')}` : ''}

Based on this team feedback data, generate a structured sector plan with the following 8 sections. Return ONLY a JSON object with these exact keys: water_profile, game_plan, starting_plan, techniques, flies, lines, challenges, coach_notes.

Each value should be a detailed paragraph or structured text (use line breaks for readability). Base everything on patterns in the data. Be specific about what worked, what lines, what retrieves, what flies. The team fishes loch-style with wetflies — their core approach uses wetfly construction with competition nymph triggers (UV, hotspots, soft hackle, knotted legs). Keep recommendations aligned with this style. Coach notes should be a punchy 2-3 sentence headline message to the team.
    `

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Generation failed')
      const text = data.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const generated = JSON.parse(clean)

      // Merge with existing plan — don't overwrite sections coach has already edited
      const merged = { ...generated, ...(plan || {}) }
      // But use generated for empty sections
      Object.keys(generated).forEach(key => {
        if (!plan?.[key] || plan[key].trim() === '') {
          merged[key] = generated[key]
        }
      })

      await supabase.from('sector_plans_v2').upsert({
        sector,
        content: merged,
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'sector' })

      setPlan(merged)
      setLastUpdated(new Date().toISOString())
    } catch (err) {
      console.error('Generate error:', err)
    }

    setGenerating(false)
  }

  function timeAgo(ts) {
    if (!ts) return null
    const diff = (Date.now() - new Date(ts)) / 1000
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) return <div className="spinner" />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : 'No plan yet'}
          </div>
        </div>
        {isCoach && (
          <button
            className="btn btn-gold"
            style={{ marginTop: 0, width: 'auto', padding: '8px 16px', fontSize: 13 }}
            onClick={generatePlan}
            disabled={generating}
          >
            {generating ? '✨ Generating...' : '✨ Generate from intel'}
          </button>
        )}
      </div>

      {generating && (
        <div style={{ background: 'rgba(255,179,2,0.08)', border: '0.5px solid rgba(255,179,2,0.25)', borderRadius: 10, padding: '14px', marginBottom: 16, fontSize: 13, color: 'var(--gold)', lineHeight: 1.6 }}>
          Reading all intel for {sector} and generating your sector plan draft... This takes about 15 seconds.
        </div>
      )}

      {PLAN_SECTIONS.map(section => (
        <PlanSection
          key={section.key}
          section={section}
          value={plan?.[section.key]}
          isCoach={isCoach}
          onSave={saveSection}
        />
      ))}
    </div>
  )
}
