import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input } from '../components/ui/Primitives'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setConfirmSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <div className="mb-1 text-2xl">🥗</div>
          <h1 className="text-lg font-semibold text-text">Meal Planner</h1>
          <p className="text-xs text-text-dim">Your personal nutrition & fitness planner</p>
        </div>

        {confirmSent ? (
          <p className="text-center text-sm text-text-dim">
            Check your email to confirm your account, then sign in.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === 'sign_in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        )}

        {!confirmSent && (
          <button
            className="mt-4 w-full text-center text-xs text-text-dim hover:text-text"
            onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
          >
            {mode === 'sign_in' ? "First time? Create your account" : 'Already have an account? Sign in'}
          </button>
        )}
      </Card>
    </div>
  )
}
