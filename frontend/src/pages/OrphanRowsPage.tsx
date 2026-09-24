import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  Target,
  Users2,
  TrendingUp,
  RotateCw,
  Eye,
  X,
  Layers,
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { api } from '../lib/api'

interface OrphanRow {
  id: number
  upload_id: number
  row_number?: number
  nik?: string
  nama?: string
  departemen?: string
  raw_data?: any
  jenis_file?: string
  tahun?: number
  triwulan?: number
}

const MODULE_CONFIG: Record<
  string,
  { label: string; shortLabel: string; icon: React.FC<any>; color: string; border: string }
> = {
  kpi_planning: {
    label: 'Performance Planning',
    shortLabel: 'Planning',
    icon: Target,
    color: 'text-emerald-500',
    border: 'border-emerald-500/30',
  },
  coaching: {
    label: 'Performance Coaching',
    shortLabel: 'Coaching',
    icon: Users2,
    color: 'text-amber-500',
    border: 'border-amber-500/30',
  },
  appraisal: {
    label: 'Performance Appraisal',
    shortLabel: 'Appraisal',
    icon: TrendingUp,
    color: 'text-blue-500',
    border: 'border-blue-500/30',
  },
  review360: {
    label: 'Performance Review (360)',
    shortLabel: 'Review 360',
    icon: RotateCw,
    color: 'text-purple-500',
    border: 'border-purple-500/30',
  },
}

export const OrphanRowsPage: React.FC = () => {
  const [orphanRows, setOrphanRows] = useState<OrphanRow[]>([])
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [selectedTw, setSelectedTw] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRawDetail, setSelectedRawDetail] = useState<OrphanRow | null>(null)

  // Scroll lock when modal is open
  useEffect(() => {
    if (selectedRawDetail) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedRawDetail])

  useEffect(() => {
    fetchOrphans()
  }, [])

  const fetchOrphans = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/uploads/orphan-rows?limit=500')
      setOrphanRows(res.data)
    } catch (err) {
      console.error('Error fetching orphan rows:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter berdasarkan TW terlebih dahulu untuk ringkasan kartu
  const rowsMatchingTw = orphanRows.filter((r) => {
    if (selectedTw !== 'all' && r.triwulan !== Number(selectedTw)) {
      return false
    }
    return true
  })

  // Hitung jumlah orphan per modul
  const countByModule = {
    all: rowsMatchingTw.length,
    kpi_planning: rowsMatchingTw.filter((r) => r.jenis_file === 'kpi_planning').length,
    coaching: rowsMatchingTw.filter((r) => r.jenis_file === 'coaching').length,
    appraisal: rowsMatchingTw.filter((r) => r.jenis_file === 'appraisal').length,
    review360: rowsMatchingTw.filter((r) => r.jenis_file === 'review360').length,
  }

  const filteredRows = rowsMatchingTw.filter((r) => {
    // Filter modul
    if (selectedModule !== 'all' && r.jenis_file !== selectedModule) {
      return false
    }
    // Filter search
    if (!search) return true
    const term = search.toLowerCase()
    return (
      (r.nama && r.nama.toLowerCase().includes(term)) ||
      (r.nik && r.nik.toLowerCase().includes(term)) ||
      (r.departemen && r.departemen.toLowerCase().includes(term)) ||
      (r.jenis_file && r.jenis_file.toLowerCase().includes(term))
    )
  })

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSelectModule = (modKey: string) => {
    setSelectedModule(modKey)
    setCurrentPage(1)
  }

  // Helper safe parse raw data
  const getParsedRawData = (data: any) => {
    if (!data) return {}
    if (typeof data === 'object') return data
    try {
      return JSON.parse(data)
    } catch {
      return { raw: String(data) }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Description Bar and TW Filter */}
      <div className="pb-2 border-b border-border-custom/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-xs text-text-muted">
          Daftar baris data dari 4 Modul Kinerja yang NIK-nya tidak ditemukan pada Data Master Karyawan Aktif
        </p>

        {/* Filter per TW */}
        <div className="flex items-center gap-1 bg-bg-card p-1 rounded-xl border border-border-custom shadow-2xs">
          <span className="text-[11px] font-semibold text-text-muted px-2">Filter TW:</span>
          {['all', '1', '2', '3', '4'].map((tw) => (
            <button
              key={tw}
              onClick={() => {
                setSelectedTw(tw)
                setCurrentPage(1)
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedTw === tw
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted'
              }`}
            >
              {tw === 'all' ? 'Semua TW' : `TW ${tw}`}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Interactive Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(MODULE_CONFIG) as [string, typeof MODULE_CONFIG['kpi_planning']][]).map(([key, config]) => {
          const Icon = config.icon
          const count = countByModule[key as keyof typeof countByModule] || 0
          const isSelected = selectedModule === key

          return (
            <button
              key={key}
              onClick={() => handleSelectModule(isSelected ? 'all' : key)}
              className={`p-4 rounded-xl border text-left transition-all duration-200 relative overflow-hidden group ${
                isSelected
                  ? `bg-bg-surface ${config.border} ring-2 ring-primary shadow-md`
                  : 'bg-bg-card border-border-custom hover:border-primary/50 hover:bg-bg-surface/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
                    {config.label}
                  </span>
                  <div className="text-2xl font-black text-text-primary">
                    {count}{' '}
                    <span className="text-xs font-normal text-text-muted">baris</span>
                  </div>
                </div>
                <div className={`${config.color} transition-transform group-hover:scale-110`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border-custom/50 flex items-center justify-between text-xs">
                <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'}`}>
                  {isSelected ? 'Sedang Ditampilkan' : 'Klik untuk filter detail'}
                </span>
                {count > 0 ? (
                  <Badge variant="danger" className="text-[10px] px-1.5 py-0.2">Perlu Review</Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0.2">Clear</Badge>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Module Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border-custom">
        <button
          onClick={() => handleSelectModule('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedModule === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-muted border border-border-custom'
          }`}
        >
          Semua Modul ({countByModule.all})
        </button>
        {(Object.entries(MODULE_CONFIG) as [string, typeof MODULE_CONFIG['kpi_planning']][]).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleSelectModule(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedModule === key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-muted border border-border-custom'
            }`}
          >
            <config.icon className="w-3.5 h-3.5" />
            {config.shortLabel} ({countByModule[key as keyof typeof countByModule] || 0})
          </button>
        ))}
      </div>

      {/* Main Table Card */}
      <Card className="border-border-custom bg-bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Daftar NIK Tidak Dikenali ({filteredRows.length} baris)
                {selectedTw !== 'all' && (
                  <Badge variant="secondary" className="ml-2 font-semibold text-xs">
                    TW {selectedTw}
                  </Badge>
                )}
                {selectedModule !== 'all' && (
                  <Badge variant="outline" className="ml-2 font-normal text-xs">
                    {MODULE_CONFIG[selectedModule]?.label}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Review data berikut untuk sinkronisasi NIK atau melengkapi data Master Karyawan
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Cari Nama / NIK Orphan..."
                className="w-full bg-bg-muted text-text-primary text-xs pl-9 pr-3 py-2 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border-custom">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Modul Kinerja</TableHead>
                  <TableHead className="text-center">Periode</TableHead>
                  <TableHead>Baris Excel</TableHead>
                  <TableHead>NIK Tertera</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Departemen Tertera</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center w-16">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((r, idx) => {
                    const modConf = r.jenis_file ? MODULE_CONFIG[r.jenis_file] : null
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-text-muted text-center">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          {modConf ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${modConf.color} inline-block`} />
                              <span className="font-semibold text-xs text-text-primary">{modConf.shortLabel}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted font-mono">#{r.upload_id}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.triwulan ? (
                            <Badge variant="outline" className="text-[11px] font-mono">
                              TW {r.triwulan} {r.tahun || ''}
                            </Badge>
                          ) : (
                            <span className="text-xs text-text-muted">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">Baris {r.row_number || '-'}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-danger">{r.nik || '-'}</TableCell>
                        <TableCell className="font-semibold text-text-primary">{r.nama || '-'}</TableCell>
                        <TableCell className="text-text-secondary text-xs">{r.departemen || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="danger" className="text-[11px]">NIK Not Found</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => setSelectedRawDetail(r)}
                            title="Lihat Data Mentah Excel"
                            className="p-1.5 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-primary transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-text-muted text-xs">
                      {isLoading ? (
                        'Memuat data orphan...'
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <span className="font-bold text-sm text-text-primary">Bagus! Tidak ada data orphan yang perlu direview.</span>
                          <span>Semua baris data pada modul dan periode ini cocok dengan Master Data Karyawan Aktif.</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border-custom text-xs">
              <span className="text-text-muted">
                Halaman {currentPage} dari {totalPages} (Total {filteredRows.length} baris)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detail Raw Data via React Portal */}
      {selectedRawDetail &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedRawDetail(null)}
          >
            <div
              className="bg-bg-card border border-border-custom rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between bg-bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">
                      Detail Baris Raw: {selectedRawDetail.nama || selectedRawDetail.nik}
                    </h4>
                    <p className="text-[11px] text-text-muted">
                      Baris ke-{selectedRawDetail.row_number} &bull; Modul:{' '}
                      {selectedRawDetail.jenis_file ? MODULE_CONFIG[selectedRawDetail.jenis_file]?.label : `Upload #${selectedRawDetail.upload_id}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRawDetail(null)}
                  className="p-2 rounded-xl hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors border border-border-custom/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3 text-xs bg-bg-surface p-3.5 rounded-xl border border-border-custom">
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-bold">NIK Tertera:</span>
                    <span className="font-mono font-bold text-danger text-sm">{selectedRawDetail.nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Nama Tertera:</span>
                    <span className="font-semibold text-text-primary text-sm">{selectedRawDetail.nama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Departemen:</span>
                    <span className="text-text-secondary">{selectedRawDetail.departemen || '-'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-bold">Upload ID:</span>
                    <span className="font-mono text-text-secondary">#{selectedRawDetail.upload_id}</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Seluruh Kolom Excel Asli:
                  </h5>
                  <div className="p-3.5 rounded-xl bg-bg-surface border border-border-custom overflow-x-auto max-h-60">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-custom text-text-muted uppercase text-[10px]">
                          <th className="py-1 px-2 font-bold">Kolom</th>
                          <th className="py-1 px-2 font-bold">Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom/40 font-mono text-[11px]">
                        {Object.entries(getParsedRawData(selectedRawDetail.raw_data)).map(([k, v]: [string, any]) => (
                          <tr key={k}>
                            <td className="py-1.5 px-2 text-text-muted">{k}</td>
                            <td className="py-1.5 px-2 text-text-primary font-semibold">{String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-border-custom bg-bg-surface flex justify-end">
                <button
                  onClick={() => setSelectedRawDetail(null)}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
