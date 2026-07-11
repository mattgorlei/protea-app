import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Log from './pages/Log'
import Flybox from './pages/Flybox'
import Intel from './pages/Intel'
import PracticeWaters from './pages/PracticeWaters'
import Profile from './pages/Profile'
import MiniComp from './pages/MiniComp'

function NavIcon({ id }) {
  const icons = {
    feed: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    log: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    flybox: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"/><line x1="12" y1="8" x2="16" y2="4"/></svg>,
    intel: <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    comp: <svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
    profile: <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    comp: <svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
    settings: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  }
  return icons[id] || null
}

export default function App() {
  const { user, profile, loading } = useAuth()
  const [tab, setTab] = useState('feed')
  const [toast, setToast] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [unreadAnn, setUnreadAnn] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!user) return
    const lastSeen = localStorage.getItem('ann_last_seen') || '1970-01-01'
    import('./lib/supabase').then(({ supabase }) => {
      supabase.from('announcements').select('id', { count: 'exact', head: true }).gt('created_at', lastSeen).then(({ count }) => {
        setUnreadAnn(count || 0)
      })
    })
  }, [user])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user || !profile) return <Login />

  const tabs = [
    { id: 'feed', label: 'Feed' },
    { id: 'log', label: 'Log' },
    { id: 'flybox', label: 'Flybox' },
    { id: 'intel', label: 'Intel' },
    { id: 'profile', label: 'Profile' },
    { id: 'comp', label: 'Comp' },
    { id: 'settings', label: 'Settings' },
  ]

  const teamColor = profile.team === 'U24'
    ? { bg: 'rgba(55,138,221,0.25)', text: '#85B7EB' }
    : profile.team === 'U19'
    ? { bg: 'rgba(255,179,2,0.25)', text: '#7a5500' }
    : { bg: 'rgba(255,179,2,0.2)', text: '#7a5500' }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Protea</div>
          <div className="topbar-sub">SA Youth World Champs · Donegal 2026</div>
        </div>
        <div className="topbar-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ position: 'relative' }}>
            <div className="topbar-avatar" style={{ background: teamColor.bg, color: teamColor.text, cursor: 'pointer' }} onClick={() => setShowProfileMenu(v => !v)}>
              {profile.initials || profile.name?.slice(0, 2).toUpperCase()}
            </div>
            {showProfileMenu && (
              <div style={{ position: 'absolute', right: 0, top: 42, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 50, minWidth: 180, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{profile.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{profile.team} · {profile.role}</div>
                </div>
                <button onClick={async () => {
                  const { supabase: sb } = await import('./lib/supabase')
                  await sb.auth.signOut()
                }} style={{ display: 'block', width: '100%', padding: '12px 14px', background: 'none', border: 'none', color: '#F09595', fontSize: 14, textAlign: 'left', cursor: 'pointer' }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="scroll-area">
        {tab === 'feed' && <Feed profile={profile} />}
        {tab === 'log' && <Log profile={profile} showToast={showToast} />}
        {tab === 'flybox' && <Flybox profile={profile} showToast={showToast} />}
        {tab === 'intel' && <Intel profile={profile} />}
        {tab === 'settings' && <PracticeWaters profile={profile} showToast={showToast} />}
        {tab === 'profile' && <Profile profile={profile} isCoach={['coach','manager'].includes(profile?.role)} showToast={showToast} />}
      </div>

      <div className="bottom-nav">
        {tabs.map(t => (
          <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => {
              if (t.id === 'feed') { setUnreadAnn(0); localStorage.setItem('ann_last_seen', new Date().toISOString()) }
              setTab(t.id)
            }}>
            <NavIcon id={t.id} />
            {t.id === 'feed' && unreadAnn > 0 && <span className="nav-badge">{unreadAnn}</span>}
            {t.label}
          </button>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
