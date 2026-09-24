import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { ThemeToggle } from '../components/ThemeToggle'

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await api.post('/auth/login', { username, password })
      login(res.data.access_token, res.data.user)
      navigate('/planning')
    } catch (err: any) {
      const errMsg =
        err.response?.data?.detail ||
        'Gagal terhubung ke server backend. Pastikan server backend FastAPI aktif di port 8000.'
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Background Decorative Gradient Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        {/* Card Container */}
        <div className="bg-bg-card border border-border-custom rounded-2xl shadow-xl p-8 backdrop-blur relative z-10">
          {/* Logo & Header (Clean Transparent Logo without box) */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center">
              <img
                src="/logo-pg.png"
                alt="Logo Petrokimia Gresik"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-pg.jpg'
                }}
              />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary">
              PETROKIMIA GRESIK
            </h1>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">
              Performance Management System
            </p>
            <p className="text-xs text-text-muted mt-2">
              Masuk untuk mengelola data kinerja pegawai
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-danger-bg text-danger border border-danger/30 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Username / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full bg-bg-muted text-text-primary text-sm pl-10 pr-4 py-2.5 rounded-xl border border-border-custom focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full bg-bg-muted text-text-primary text-sm pl-10 pr-10 py-2.5 rounded-xl border border-border-custom focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-text-muted mt-6">
          © 2026 PT Petrokimia Gresik. Hak Cipta Dilindungi.
        </p>
      </div>
    </div>
  )
}
