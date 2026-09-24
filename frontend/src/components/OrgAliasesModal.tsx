import React, { useEffect, useState } from 'react'
import { BookOpen, Search, Plus, Trash2, X, CheckCircle2, AlertCircle, Building2 } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface OrgAlias {
  id: number
  nama_asli: string
  nama_kanonik: string
  jenis: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const OrgAliasesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [aliases, setAliases] = useState<OrgAlias[]>([])
  const [search, setSearch] = useState('')
  const [selectedJenis, setSelectedJenis] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form state
  const [newAsli, setNewAsli] = useState('')
  const [newKanonik, setNewKanonik] = useState('')
  const [newJenis, setNewJenis] = useState('kompartemen')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAliases()
    }
  }, [isOpen])

  const fetchAliases = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/aliases')
      setAliases(res.data)
    } catch (err) {
      console.error('Error fetching aliases:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAsli.trim() || !newKanonik.trim()) {
      setFeedback({ type: 'error', message: 'Nama asli dan nama kanonik wajib diisi.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)
    try {
      await api.post('/aliases', {
        nama_asli: newAsli.trim(),
        nama_kanonik: newKanonik.trim(),
        jenis: newJenis
      })
      setFeedback({ type: 'success', message: `Mapping untuk "${newAsli}" berhasil ditambahkan!` })
      setNewAsli('')
      setNewKanonik('')
      fetchAliases()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Gagal menambahkan mapping alias.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus mapping alias untuk "${nama}"?`)) return

    try {
      await api.delete(`/aliases/${id}`)
      setAliases(aliases.filter((a) => a.id !== id))
      setFeedback({ type: 'success', message: `Mapping "${nama}" berhasil dihapus.` })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Gagal menghapus alias.'
      })
    }
  }

  if (!isOpen) return null

  const filtered = aliases.filter((a) => {
    if (selectedJenis !== 'all' && a.jenis.toLowerCase() !== selectedJenis.toLowerCase()) {
      return false
    }
    if (!search) return true
    const term = search.toLowerCase()
    return (
      a.nama_asli.toLowerCase().includes(term) ||
      a.nama_kanonik.toLowerCase().includes(term) ||
      a.jenis.toLowerCase().includes(term)
    )
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-bg-surface border border-border-custom rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between bg-bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-base text-text-primary flex items-center gap-2">
                Kamus Alias Unit Organisasi (`org_unit_aliases`)
              </h4>
              <p className="text-xs text-text-muted">
                Daftar standarisasi variasi nama file mentah ke nama kanonik resmi (Dapat disesuaikan saat re-organisasi)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-muted text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs ${
              feedback.type === 'success'
                ? 'bg-success-bg border-success/30 text-success'
                : 'bg-danger-bg border-danger/30 text-danger'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Tambah Mapping Baru */}
        <div className="p-6 border-b border-border-custom bg-bg-card/50">
          <h5 className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-primary" />
            Tambah Variasi Penulisan Baru
          </h5>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="text-[11px] font-medium text-text-muted block mb-1">Tingkat Unit</label>
              <select
                value={newJenis}
                onChange={(e) => setNewJenis(e.target.value)}
                className="w-full bg-bg-muted text-text-primary text-xs px-3 py-2 rounded-lg border border-border-custom focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="kompartemen">Kompartemen</option>
                <option value="departemen">Departemen</option>
                <option value="direktorat">Direktorat</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] font-medium text-text-muted block mb-1">
                Variasi Asli / Singkatan Mentah
              </label>
              <input
                type="text"
                value={newAsli}
                onChange={(e) => setNewAsli(e.target.value)}
                placeholder="Contoh: Komp Mitra Bisnis"
                className="w-full bg-bg-muted text-text-primary text-xs px-3 py-2 rounded-lg border border-border-custom focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] font-medium text-text-muted block mb-1">
                Nama Kanonik Resmi
              </label>
              <input
                type="text"
                value={newKanonik}
                onChange={(e) => setNewKanonik(e.target.value)}
                placeholder="Contoh: Kompartemen Mitra Bisnis"
                className="w-full bg-bg-muted text-text-primary text-xs px-3 py-2 rounded-lg border border-border-custom focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover text-white text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Filter & List Controls */}
        <div className="px-6 py-3 border-b border-border-custom flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg-muted/30">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {['all', 'kompartemen', 'departemen', 'direktorat'].map((j) => (
              <button
                key={j}
                onClick={() => setSelectedJenis(j)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  selectedJenis === j
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-bg-surface text-text-secondary hover:text-text-primary border border-border-custom'
                }`}
              >
                {j === 'all' ? `Semua (${aliases.length})` : j}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari variasi / nama resmi..."
              className="w-full bg-bg-surface text-text-primary text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-text-muted">Memuat daftar alias...</div>
          ) : filtered.length > 0 ? (
            <div className="border border-border-custom rounded-xl overflow-hidden bg-bg-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-custom bg-bg-muted/50 text-text-muted font-bold">
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4 w-28">Tingkat</th>
                    <th className="py-2.5 px-4">Variasi Asli / Singkatan (Input File)</th>
                    <th className="py-2.5 px-4">Nama Kanonik Resmi (Output Standar)</th>
                    <th className="py-2.5 px-4 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {filtered.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-bg-muted/40 transition-colors">
                      <td className="py-2.5 px-4 text-center text-text-muted font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase capitalize ${
                            a.jenis === 'kompartemen'
                              ? 'border-emerald-500/40 text-emerald-500'
                              : a.jenis === 'departemen'
                              ? 'border-blue-500/40 text-blue-500'
                              : 'border-amber-500/40 text-amber-500'
                          }`}
                        >
                          {a.jenis}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-text-primary font-semibold">
                        {a.nama_asli}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-primary">
                        {a.nama_kanonik}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDelete(a.id, a.nama_asli)}
                          title="Hapus mapping ini"
                          className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-text-muted">
              Tidak ada mapping alias yang cocok dengan pencarian.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-custom bg-bg-card flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            Total {filtered.length} aturan mapping aktif dalam database
          </span>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs px-4 py-1.5 border-border-custom hover:bg-bg-muted"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}
