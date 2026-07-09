import { useState, useEffect, useCallback } from 'react'
import { supabase, SECTORS, REACTIONS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function avatarColor(name) {
  const colors = [
    { bg: 'rgba(29,158,117,0.2)', text: '#5DCAA5' },
    { bg: 'rgba(55,138,221,0.2)', text: '#85B7EB' },
    { bg: 'rgba(239,159,39,0.2)', text: '#FAC775' },
    { bg: 'rgba(212,83,126,0.2)', text: '#ED93B1' },
    { bg: 'rgba(127,119,221,0.2)', text: '#AFA9EC' },
  ]
  const i = (name || '').charCodeAt(0) % colors.length
  return colors[i]
}

function entryLabel(entry) {
  const map = { fish_feedback: 'Fish feedback', observation: 'Observation', end_of_day: 'End of day', competition: 'Comp session' }
  return map[entry.entry_type] || entry.entry_type
}

function entryBody(entry) {
  if (entry.entry_type === 'observation') return entry.obs_learning || ''
  if (entry.entry_type === 'end_of_day') return entry.eod_general_feedback || ''
  if (entry.entry_type === 'competition') return entry.comp_technique_description || `${entry.comp_fish_count || 0} fish · ${entry.comp_placing || ''}`
  if (entry.entry_type === 'fish_feedback') {
    const parts = []
    if (entry.flies?.name) parts.push(`${entry.flies.name} #${entry.flies.size}`)
    if (entry.line_used) parts.push(entry.line_used)
    if (entry.method || entry.river_method) parts.push(entry.method || entry.river_method)
    if (entry.retrieve_speed) parts.push(entry.retrieve_speed)
    if (entry.retrieve_activations?.length) parts.push(entry.retrieve_activations.join(', '))
    if (entry.additional_notes) parts.push(entry.additional_notes)
    return parts.join(' · ')
  }
  return ''
}

function entryDetail(entry) {
  const rows = []
  if (entry.session_time) rows.push({ label: 'Time', value: entry.session_time })
  if (entry.entry_type === 'fish_feedback') {
    if (entry.flies?.name) rows.push({ label: 'Fly', value: `${entry.flies.name} #${entry.flies.size}` })
    if (entry.line_used) rows.push({ label: 'Line', value: entry.line_used })
    if (entry.method) rows.push({ label: 'Method', value: entry.method })
    if (entry.river_method) rows.push({ label: 'Method', value: entry.river_method })
    if (entry.retrieve_speed) rows.push({ label: 'Speed', value: entry.retrieve_speed })
    if (entry.retrieve_activations?.length) rows.push({ label: 'Activation', value: entry.retrieve_activations.join(', ') })
    if (entry.additional_notes) rows.push({ label: 'Notes', value: entry.additional_notes })
  }
  if (entry.entry_type === 'observation') {
    if (entry.obs_learning) rows.push({ label: 'Learning', value: entry.obs_learning })
    if (entry.obs_importance) rows.push({ label: 'Why it matters', value: entry.obs_importance })
    if (entry.obs_comp_sector) rows.push({ label: 'Relates to', value: entry.obs_comp_sector })
    if (entry.obs_other) rows.push({ label: 'Other', value: entry.obs_other })
  }
  if (entry.entry_type === 'end_of_day') {
    if (entry.eod_practiced_for) rows.push({ label: 'Practiced for', value: entry.eod_practiced_for })
    if (entry.eod_confidence) rows.push({ label: 'Confidence', value: `${entry.eod_confidence}/5` })
    if (entry.eod_key_learnings?.length) rows.push({ label: 'Key learnings', value: entry.eod_key_learnings.join(' · ') })
    if (entry.eod_biggest_challenge) rows.push({ label: 'Biggest challenge', value: entry.eod_biggest_challenge })
    if (entry.eod_general_feedback) rows.push({ label: 'Feedback', value: entry.eod_general_feedback })
  }
  if (entry.entry_type === 'competition') {
    if (entry.comp_beat) rows.push({ label: 'Beat / Boat', value: entry.comp_beat })
    if (entry.comp_boat_partner) rows.push({ label: 'Partner', value: entry.comp_boat_partner })
    if (entry.comp_fish_count != null) rows.push({ label: 'Fish', value: entry.comp_fish_count })
    if (entry.comp_placing) rows.push({ label: 'Placing estimate', value: entry.comp_placing })
    if (entry.comp_most_effective_method) rows.push({ label: 'Best method', value: entry.comp_most_effective_method })
    if (entry.comp_technique_description) rows.push({ label: 'Technique', value: entry.comp_technique_description })
    if (entry.comp_boat_partner_notes) rows.push({ label: 'Partner notes', value: entry.comp_boat_partner_notes })
    if (entry.comp_suggestion_to_next) rows.push({ label: 'Tip for next teammate', value: entry.comp_suggestion_to_next })
  }
  return rows
}

function FeedEntry({ entry, profile, onDelete }) {
  const [reactions, setReactions] = useState([])
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [flagged, setFlagged] = useState(entry.flag_requested || false)
  const [showMenu, setShowMenu] = useState(false)

  const isOwn = entry.user_id === profile?.id
  const isManagement = ['coach', 'manager'].includes(profile?.role)

  async function requestDelete() {
    await supabase.from('entries').update({ flag_requested: true }).eq('id', entry.id)
    setFlagged(true)
    setShowMenu(false)
  }

  async function deleteEntry() {
    await supabase.from('entries').delete().eq('id', entry.id)
    onDelete(entry.id)
    setShowMenu(false)
  }

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase.from('reactions').select('*').eq('entry_id', entry.id)
    setReactions(data || [])
  }, [entry.id])

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(name, initials, role, team)')
      .eq('entry_id', entry.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }, [entry.id])

  useEffect(() => {
    fetchReactions()
    fetchComments()
  }, [fetchReactions, fetchComments])

  async function toggleReaction(emoji) {
    const existing = reactions.find(r => r.user_id === profile.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ entry_id: entry.id, user_id: profile.id, emoji })
    }
    fetchReactions()
  }

  async function submitComment() {
    if (!commentText.trim()) return
    setSubmitting(true)
    await supabase.from('comments').insert({ entry_id: entry.id, user_id: profile.id, body: commentText.trim() })
    setCommentText('')
    await fetchComments()
    setSubmitting(false)
  }

  const authorName = entry.profiles?.name || 'Unknown'
  const initials = entry.profiles?.initials || authorName.slice(0, 2).toUpperCase()
  const team = entry.profiles?.team
  const color = avatarColor(authorName)

  const reactionSummary = REACTIONS.map(emoji => {
    const count = reactions.filter(r => r.emoji === emoji).length
    const mine = reactions.some(r => r.emoji === emoji && r.user_id === profile?.id)
    return { emoji, count, mine }
  }).filter(r => r.count > 0 || true).slice(0, 4)

  const entryColor = ENTRY_COLORS[entry.entry_type] || {}
  return (
    <div className="feed-item" style={{ borderColor: entryColor.border, background: entryColor.bg }}>
      <div className="feed-meta">
        <div className="feed-avatar" style={{ background: color.bg, color: color.text }}>{initials}</div>
        <div>
          <span className="feed-name">{authorName}</span>
          {team === 'U24' && <span className="badge badge-u24" style={{ marginLeft: 6 }}>U24</span>}
          {team === 'U19' && <span className="badge badge-u19" style={{ marginLeft: 6 }}>U19</span>}
          {entry.profiles?.role === 'coach' && <span className="badge badge-coach" style={{ marginLeft: 6 }}>Coach</span>}
        </div>
        <div className="feed-time">{timeAgo(entry.created_at)}</div>
        {(isOwn || isManagement) && (
          <div style={{ position: 'relative', marginLeft: 4 }}>
            <button onClick={() => setShowMenu(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>⋯</button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: 24, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 10, minWidth: 160, overflow: 'hidden' }}>
                {isOwn && !isManagement && !flagged && (
                  <button onClick={requestDelete} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>🚩 Request delete</button>
                )}
                {isManagement && (
                  <button onClick={deleteEntry} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#F09595', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>🗑️ Delete entry</button>
                )}
                <button onClick={() => setShowMenu(false)} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
      {flagged && (
        <div style={{ fontSize: 11, color: '#FAC775', background: 'rgba(250,199,117,0.1)', border: '0.5px solid rgba(250,199,117,0.3)', borderRadius: 6, padding: '4px 8px', marginBottom: 8 }}>
          {isManagement ? '🚩 Delete requested by angler' : '🚩 Delete request sent to management'}
        </div>
      )}

      <div className="feed-tags">
        <span className="feed-tag">{entry.sector}</span>
        <span className="feed-tag">{entryLabel(entry)}</span>
        {entry.conditions && <span className="feed-tag">{entry.conditions}</span>}
        {entry.entry_mode === 'competition' && <span className="feed-tag" style={{ color: 'var(--green-mid)', borderColor: 'rgba(29,158,117,0.3)' }}>Comp</span>}
      </div>

      <div className="feed-body" onClick={() => setExpanded(v => !v)} style={{ cursor: 'pointer' }}>
        {entryBody(entry)}
        <span style={{ fontSize: 12, color: 'var(--green-mid)', marginLeft: 4 }}>{expanded ? '▲ less' : '▼ more'}</span>
      </div>

      {expanded && (
        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 10 }}>
          {entryDetail(entry).map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)', minWidth: 110, flexShrink: 0 }}>{label}</span>
              <span style={{ color: 'var(--text)', lineHeight: 1.45 }}>{value}</span>
            </div>
          ))}
          {entryDetail(entry).length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No additional detail available.</div>
          )}
        </div>
      )}

      <div className="feed-actions">
        {REACTIONS.map(emoji => {
          const r = reactions.filter(x => x.emoji === emoji)
          return (
            <button
              key={emoji}
              className={`reaction-btn ${r.some(x => x.user_id === profile?.id) ? 'mine' : ''}`}
              onClick={() => toggleReaction(emoji)}
            >
              {emoji}{r.length > 0 ? ` ${r.length}` : ''}
            </button>
          )
        })}
        <div className="comment-toggle" onClick={() => setShowComments(v => !v)}>
          💬 {comments.length}
        </div>
      </div>

      {showComments && (
        <div className="comments-section">
          {comments.map(c => (
            <div className="comment" key={c.id}>
              <div className="comment-bubble">{c.body}</div>
              <div className="comment-meta">{c.profiles?.name} · {timeAgo(c.created_at)}</div>
            </div>
          ))}
          <div className="comment-input-row">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
            />
            <button className="comment-send" onClick={submitComment} disabled={submitting}>Send</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({ ann, profile, onDelete, onTogglePin }) {
  const isCoach = ['coach', 'manager'].includes(profile?.role)
  return (
    <div style={{
      background: ann.pinned ? 'rgba(255,179,2,0.08)' : 'var(--bg-card)',
      border: `1px solid ${ann.pinned ? 'rgba(255,179,2,0.4)' : 'var(--border)'}`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{ann.pinned ? '📌' : '📣'}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: ann.pinned ? 'var(--gold)' : 'var(--text)' }}>
          {ann.profiles?.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(ann.created_at)}</span>
        {isCoach && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onTogglePin(ann)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {ann.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={() => onDelete(ann.id)} style={{ fontSize: 11, color: '#F09595', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{ann.body}</div>
    </div>
  )
}

const ENTRY_COLORS = {
  fish_feedback: { border: 'rgba(29,158,117,0.4)', bg: 'rgba(29,158,117,0.06)', label: '#5DCAA5' },
  observation:   { border: 'rgba(255,179,2,0.4)',   bg: 'rgba(255,179,2,0.06)',   label: '#FFB302' },
  end_of_day:    { border: 'rgba(127,119,221,0.4)', bg: 'rgba(127,119,221,0.06)', label: '#AFA9EC' },
  competition:   { border: 'rgba(212,83,126,0.4)',  bg: 'rgba(212,83,126,0.06)',  label: '#ED93B1' },
}

export default function Feed({ profile }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [sector, setSector] = useState('All')
  const [practiceWaters, setPracticeWaters] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [postingAnn, setPostingAnn] = useState(false)
  const [showAnnForm, setShowAnnForm] = useState(false)
  const isCoach = ['coach', 'manager'].includes(profile?.role)

  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(name)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
  }, [])

  async function postAnnouncement() {
    if (!newAnnouncement.trim()) return
    setPostingAnn(true)
    await supabase.from('announcements').insert({ user_id: profile.id, body: newAnnouncement.trim() })
    setNewAnnouncement('')
    setShowAnnForm(false)
    setPostingAnn(false)
    fetchAnnouncements()
  }

  async function deleteAnnouncement(id) {
    await supabase.from('announcements').delete().eq('id', id)
    fetchAnnouncements()
  }

  async function togglePin(ann) {
    await supabase.from('announcements').update({ pinned: !ann.pinned }).eq('id', ann.id)
    fetchAnnouncements()
  }

  const fetchEntries = useCallback(async () => {
    let query = supabase
      .from('entries')
      .select('*, profiles(name, initials, role, team), flies(name, size)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (sector !== 'All') {
      if (sector.startsWith('pw:')) {
        query = query.eq('practice_water_name', sector.replace('pw:', ''))
      } else {
        query = query.or(`sector.eq.${sector},applicable_sectors.cs.{"${sector}"}`)
      }
    }

    const { data } = await query
    setEntries(data || [])
    setLoading(false)
  }, [sector])

  useEffect(() => {
    fetchEntries()
    fetchAnnouncements()
    supabase.from('practice_waters').select('*').order('name').then(({ data }) => setPracticeWaters(data || []))

    const channel = supabase
      .channel('entries-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, fetchEntries)
      .subscribe()

    // Refetch when tab becomes visible again
    const onVisible = () => { if (document.visibilityState === 'visible') fetchEntries() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchEntries])

  return (
    <div className="screen active" id="screen-feed">
      {/* Pinned announcements always show */}
      {announcements.filter(a => a.pinned).map(ann => (
        <AnnouncementCard key={ann.id} ann={ann} profile={profile} onDelete={deleteAnnouncement} onTogglePin={togglePin} />
      ))}

      {/* Coach announcement form */}
      {isCoach && (
        <div style={{ marginBottom: 10 }}>
          {showAnnForm ? (
            <div className="card" style={{ marginBottom: 0 }}>
              <label style={{ marginTop: 0 }}>Announcement</label>
              <textarea
                rows={3}
                placeholder="Share something with the team..."
                value={newAnnouncement}
                onChange={e => setNewAnnouncement(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ marginTop: 10 }} onClick={postAnnouncement} disabled={postingAnn || !newAnnouncement.trim()}>
                  {postingAnn ? 'Posting...' : 'Post announcement'}
                </button>
                <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowAnnForm(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAnnForm(true)}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,179,2,0.08)', border: '1px dashed rgba(255,179,2,0.4)', borderRadius: 10, color: 'var(--gold)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              📣 Post announcement
            </button>
          )}
        </div>
      )}

      {/* Unpinned announcements */}
      {sector === 'All' && announcements.filter(a => !a.pinned).map(ann => (
        <AnnouncementCard key={ann.id} ann={ann} profile={profile} onDelete={deleteAnnouncement} onTogglePin={togglePin} />
      ))}

      <div className="sector-scroll">
        {['All', 'All Loughs', ...SECTORS].map(s => (
          <div key={s} className={`sector-pill ${sector === s ? 'active' : ''}`} onClick={() => setSector(s)}>
            {s === 'All' ? 'All sectors' : s}
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

      {!loading && entries.length === 0 && (
        <div className="empty-state">
          <div className="icon">🎣</div>
          <p>No entries yet for this sector.<br />Be the first to log something.</p>
        </div>
      )}

      {entries.map(entry => (
        <FeedEntry key={entry.id} entry={entry} profile={profile} onDelete={id => setEntries(prev => prev.filter(e => e.id !== id))} />
      ))}
    </div>
  )
}
