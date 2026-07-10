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

function PlanSection({ section, value, isCoach, isCoachEdited, onSave }) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCoachEdited && <span style={{ fontSize: 10, color: 'var(--gold)', background: 'rgba(255,179,2,0.12)', border: '0.5px solid rgba(255,179,2,0.3)', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>Coach edit</span>}
          {isCoach && !editing && (
            <button onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {isEmpty ? '+ Add' : 'Edit'}
            </button>
          )}
        </div>
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
  const [reportHtml, setReportHtml] = useState(null)

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
    const coachEdited = new Set(plan?._coach_edited || [])
    coachEdited.add(key)
    const newContent = { ...(plan || {}), [key]: value, _coach_edited: [...coachEdited] }
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

    console.log('Entries fetched for', sector, ':', entries?.length)
    if (!entries || entries.length === 0) {
      setReportHtml('<html><body style="font-family:sans-serif;padding:32px;color:#333;"><h2>No intel logged yet for ' + sector + '</h2><p>Log some practice sessions first, then generate the report.</p></body></html>')
      setGenerating(false)
      return
    }
    console.log('Sample entry:', JSON.stringify(entries[0], null, 2))

    // Build context summary for AI
    const fishFeedback = entries.filter(e => e.entry_type === 'fish_feedback')
    const observations = entries.filter(e => e.entry_type === 'observation')
    const eodEntries = entries.filter(e => e.entry_type === 'end_of_day')
    const compEntries = entries.filter(e => e.entry_type === 'competition')

    const coachEdited = new Set(plan?._coach_edited || [])
    const coachEditedSections = coachEdited.size > 0
      ? [...coachEdited].map(key => key + ': ' + plan[key]).join('\n\n')
      : 'None — all sections can be generated.'

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

RULES:
- You MUST return ALL 8 sections every time. Never skip a section.
- Use ONLY the feed data provided above. Do NOT use general fly fishing knowledge.
- If data is thin for a section, write what you can from the data and note "More intel needed" at the end.
- Format as SHORT bullet points (• ). Max 6 bullets per section.
- Be specific — use exact fly names, line names, retrieve names from the data.
- The team fishes loch-style wetflies. Only reference this if the data supports it.

For these sections the coach has already provided content — use their exact text as the value, do not change it:
${coachEditedSections}

For all other sections, generate from the feed data above.

Return ONLY a valid JSON object with exactly these 8 keys, no other text, no markdown fences:
water_profile, game_plan, starting_plan, techniques, flies, lines, challenges, coach_notes
    `

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })

      const data = await response.json()
      console.log('API ok:', response.ok, 'text length:', data.text?.length)
      if (!response.ok) throw new Error(data.error || 'Generation failed')
      const text = data.text || ''
      console.log('Raw response preview:', text.substring(0, 200))
      const clean = text.replace(/```json|```/g, '').trim()
      let generated
      try {
        generated = JSON.parse(clean)
        console.log('Parsed sections:', Object.keys(generated))
      } catch(parseErr) {
        console.error('JSON parse failed:', parseErr.message)
        console.log('Clean text:', clean.substring(0, 500))
        // Show raw text in report if JSON fails
        setReportHtml('<html><body style="font-family:sans-serif;padding:32px;color:#333;"><h2>Raw AI Response</h2><pre style="white-space:pre-wrap;font-size:13px;">' + clean + '</pre></body></html>')
        setGenerating(false)
        return
      }

      // Export as PDF — don't touch the sector plan
      exportIntelPDF(generated)

    } catch (err) {
      console.error('Generate error:', err)
      setReportHtml('<html><body style="font-family:sans-serif;padding:32px;color:#333;"><h2>Error generating report</h2><p>' + err.message + '</p></body></html>')
    }

    setGenerating(false)
  }

  function exportIntelPDF(intel) {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const sections = PLAN_SECTIONS.map(s => {
      const raw = intel?.[s.key]
      const val = Array.isArray(raw) ? raw.join('\n') : (typeof raw === 'string' ? raw : null)
      if (!val) return ''
      return `<div class="section">
        <div class="section-title">${s.label}</div>
        <div class="section-body">${val.split('\n').join('<br/>').split('•').join('<span class="bullet">•</span>')}</div>
      </div>`
    }).filter(Boolean).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${sector} — Intel Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 32px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 3px solid #1B3838; padding-bottom: 16px; margin-bottom: 24px; }
    .team { font-size: 11px; font-weight: 700; color: #1B3838; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
    .sector-name { font-size: 28px; font-weight: 800; color: #1B3838; letter-spacing: -0.5px; }
    .meta { font-size: 13px; color: #666; margin-top: 4px; }
    .ai-badge { display: inline-block; font-size: 11px; font-weight: 700; color: #7a5500; background: #fff4d6; border: 1px solid #FFB302; border-radius: 99px; padding: 2px 10px; margin-top: 8px; }
    .disclaimer { font-size: 12px; color: #888; margin-top: 8px; line-height: 1.5; font-style: italic; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 11px; font-weight: 700; color: #FFB302; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; border-left: 3px solid #FFB302; padding-left: 8px; }
    .section-body { font-size: 14px; line-height: 1.7; color: #222; padding-left: 11px; }
    .bullet { color: #1B3838; font-weight: 700; margin-right: 4px; }
    @media print { body { padding: 16px; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="team">Protea SA Youth · World Champs Donegal 2026</div>
    <div class="sector-name">${sector}</div>
    <div class="meta">AI Intel Report · ${date}</div>
    <div class="ai-badge">✨ AI Generated from team feed</div>
    <div class="disclaimer">Based only on logged team intel. Use as input to build your sector plan — coach judgement and team strategy take priority.</div>
  </div>
  ${sections}
</body>
</html>`

    setReportHtml(html)
  }

  function timeAgo(ts) {
    if (!ts) return null
    const diff = (Date.now() - new Date(ts)) / 1000
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  function exportPDF() {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const sections = PLAN_SECTIONS.map(s => {
      const val = typeof plan?.[s.key] === 'string' && plan[s.key] ? plan[s.key] : null
      if (!val) return ''
      return `<div class="section">
        <div class="section-title">${s.label}</div>
        <div class="section-body">${val.split('\n').join('<br/>').split('•').join('<span class="bullet">•</span>')}</div>
      </div>`
    }).filter(Boolean).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${sector} — Sector Plan</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 32px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 3px solid #1B3838; padding-bottom: 16px; margin-bottom: 24px; }
    .team { font-size: 11px; font-weight: 700; color: #1B3838; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
    .sector-name { font-size: 28px; font-weight: 800; color: #1B3838; letter-spacing: -0.5px; }
    .meta { font-size: 13px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 11px; font-weight: 700; color: #FFB302; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; border-left: 3px solid #FFB302; padding-left: 8px; }
    .section-body { font-size: 14px; line-height: 1.7; color: #222; padding-left: 11px; }
    .bullet { color: #1B3838; font-weight: 700; margin-right: 4px; }
    .coach-notes { background: #fffbf0; border: 1.5px solid #FFB302; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    .coach-notes .section-title { border-left: none; padding-left: 0; }
    @media print { body { padding: 16px; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="team">Protea SA Youth · World Champs Donegal 2026</div>
    <div class="sector-name">${sector}</div>
    <div class="meta">Sector Plan · ${date}</div>
  </div>
  ${sections}
</body>
</html>`

    setReportHtml(html)
  }

  if (reportHtml) {
    const printReport = () => {
      const iframe = document.getElementById('report-iframe')
      if (iframe) {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      }
    }
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#1B3838', flexShrink: 0 }}>
          <button onClick={() => setReportHtml(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', padding: '4px 8px' }}>← Back</button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#FFB302' }}>Report</div>
          <button onClick={printReport} style={{ background: '#FFB302', border: 'none', color: '#7a5500', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>Print / Save PDF</button>
        </div>
        <iframe
          id="report-iframe"
          srcDoc={reportHtml}
          style={{ flex: 1, border: 'none', width: '100%' }}
          title="Report"
        />
      </div>
    )
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 0, width: 'auto', padding: '8px 14px', fontSize: 13 }}
            onClick={exportPDF}
          >
            📄 Export PDF
          </button>
          {isCoach && (
            <button
              className="btn btn-gold"
              style={{ marginTop: 0, width: 'auto', padding: '8px 16px', fontSize: 13 }}
              onClick={generatePlan}
              disabled={generating}
            >
              {generating ? '✨ Generating report...' : '✨ AI Intel Report'}
            </button>
          )}
        </div>
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
          value={typeof plan?.[section.key] === 'string' ? plan[section.key] : ''}
          isCoach={isCoach}
          isCoachEdited={(plan?._coach_edited || []).includes(section.key)}
          onSave={saveSection}
        />
      ))}
    </div>
  )
}
