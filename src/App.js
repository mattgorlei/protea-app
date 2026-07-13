import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Log from './pages/Log'
import Flybox from './pages/Flybox'
import Intel from './pages/Intel'
import PracticeWaters from './pages/PracticeWaters'

function NavIcon({ id }) {
  const icons = {
    feed: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    log: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    flybox: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"/><line x1="12" y1="8" x2="16" y2="4"/></svg>,
    intel: <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    comp: <svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
    prep: <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

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
    { id: 'comp', label: 'Comp' },
    { id: 'prep', label: 'Prep' },
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
        {tab === 'prep' && <PrepChecklist profile={profile} />}
        {tab === 'settings' && <PracticeWaters profile={profile} showToast={showToast} />}
        {tab === 'comp' && (
          <div className="screen active">
            <div className="section-label">Competition mode</div>
            <div className="card">
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Use the <strong style={{ color: 'var(--text)' }}>Log</strong> tab and switch to <strong style={{ color: 'var(--text)' }}>Competition</strong> mode to submit your session feedback after each comp session.
              </div>
              <button className="btn" onClick={() => setTab('log')} style={{ marginTop: 14 }}>Go to Log →</button>
            </div>
            <div className="section-label" style={{ marginTop: 16 }}>Your profile</div>
            <div className="card">
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{profile.name}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{profile.team} · {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</div>
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={async () => {
                const { supabase: sb } = await import('./lib/supabase')
                await sb.auth.signOut()
              }}>Sign out</button>
            </div>
          </div>
        )}
      </div>

      <div className="bottom-nav">
        {tabs.map(t => (
          <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <NavIcon id={t.id} />
            {t.label}
          </button>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
