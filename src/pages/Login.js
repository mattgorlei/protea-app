import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-logo">Protea</div>
      <div className="login-tagline">SA Youth · Donegal 2026</div>
      <div className="login-sub">Sign in to access the team app</div>

      <label>Email</label>
      <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />

      <label>Password</label>
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />

      <button className="btn" onClick={handleLogin} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ marginTop: 32, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
        Accounts set up by team management.<br />Contact Matt if you need access.
      </div>
    </div>
  )
}
