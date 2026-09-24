import React, { useState, useEffect, useRef } from 'react'
import {
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  Building,
  HardHat,
  Upload as UploadIcon,
  RefreshCw,
  Search,
  PieChart as PieChartIcon,
  Calendar,
  Layers,
  ShieldAlert,
  UserX,
  FileSpreadsheet,
  Eye,
  X,
  FileCheck,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import { usePeriod } from '../context/PeriodContext'

export const OverviewPage: React.FC = () => {
  const { tahun, triwulan } = usePeriod()

  // Navigation Tab inside Overview
  const [activeMainTab, setActiveMainTab] = useState<'VISUALISASI' | 'DELEGASI' | 'TIDAK_COACHING' | 'PURNA'>('VISUALISASI')

  const [stats, setStats] = useState<{
    total_karyawan: number
    aktif_count: number
    pkwt_count: number
    purna_count: number
    pi_count: number
    delegasi_count: number
    tidak_coaching_count?: number
    status_distribution: { name: string; value: number; color: string }[]
    eselon_distribution: { name: string; count: number }[]
    dir_distribution: { name: string; count: number }[]
    purna_list: any[]
  }>({
    total_karyawan: 0,
    aktif_count: 0,
    pkwt_count: 0,
    purna_count: 0,
    pi_count: 0,
    delegasi_count: 0,
    tidak_coaching_count: 0,
    status_distribution: [],
    eselon_distribution: [],
    dir_distribution: [],
    purna_list: [],
  })

  // List Data for Delegasi & Tidak Coaching
  const [delegasiList, setDelegasiList] = useState<any[]>([])
  const [tidakCoachingList, setTidakCoachingList] = useState<any[]>([])
  const [isLoadingTable, setIsLoadingTable] = useState(false)
  const [selectedDelegasiEmp, setSelectedDelegasiEmp] = useState<any | null>(null)

  // Filters
  const [directorates, setDirectorates] = useState<string[]>([])
  const [selectedDir, setSelectedDir] = useState<string>('ALL')
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('ALL_DEPT')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Upload States
  const [uploadMode, setUploadMode] = useState<'MASTER' | 'KPI'>('MASTER')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDirectorates()
    fetchDepartments()
    fetchOverviewStats()
  }, [])

  useEffect(() => {
    fetchDepartments(selectedDir)
    fetchOverviewStats(selectedDir)
  }, [selectedDir])

  useEffect(() => {
    if (activeMainTab === 'DELEGASI') {
      fetchDelegasi()
    } else if (activeMainTab === 'TIDAK_COACHING') {
      fetchTidakCoaching()
    }
  }, [activeMainTab, selectedDir, selectedDept, search])

  const fetchDirectorates = async () => {
    try {
      const res = await api.get('/employees/directorates')
      if (Array.isArray(res.data)) setDirectorates(res.data)
    } catch (err) {
      console.error('Error fetching directorates:', err)
    }
  }

  const fetchDepartments = async (dir: string = 'ALL') => {
    try {
      let url = '/employees/departments?kategori=ALL'
      if (dir && dir !== 'ALL') url += `&direktorat=${encodeURIComponent(dir)}`
      const res = await api.get(url)
      if (Array.isArray(res.data)) setDepartments(res.data)
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchOverviewStats = async (dir: string = 'ALL') => {
    try {
      let url = '/employees/overview-stats'
      if (dir && dir !== 'ALL') url += `?direktorat=${encodeURIComponent(dir)}`
      const res = await api.get(url)
      setStats(res.data)
    } catch (err) {
      console.error('Error fetching overview stats:', err)
    }
  }

  const fetchDelegasi = async () => {
    setIsLoadingTable(true)
    try {
      let url = `/employees/delegasi?limit=5000`
      if (selectedDir !== 'ALL') url += `&direktorat=${encodeURIComponent(selectedDir)}`
      if (selectedDept !== 'ALL_DEPT') url += `&departemen=${encodeURIComponent(selectedDept)}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      const res = await api.get(url)
      if (Array.isArray(res.data)) setDelegasiList(res.data)
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching delegasi:', err)
    } finally {
      setIsLoadingTable(false)
    }
  }

  const fetchTidakCoaching = async () => {
    setIsLoadingTable(true)
    try {
      let url = `/employees/tidak-coaching?limit=5000`
      if (selectedDir !== 'ALL') url += `&direktorat=${encodeURIComponent(selectedDir)}`
      if (selectedDept !== 'ALL_DEPT') url += `&departemen=${encodeURIComponent(selectedDept)}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
      const res = await api.get(url)
      if (Array.isArray(res.data)) setTidakCoachingList(res.data)
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching tidak coaching:', err)
    } finally {
      setIsLoadingTable(false)
    }
  }

  const handleProcessUpload = async () => {
    if (!uploadFile) return
    setIsUploading(true)
    setUploadSuccess(null)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      if (uploadMode === 'MASTER') {
        formData.append('source', 'OVERVIEW')
        formData.append('snapshot_date_str', new Date().toISOString().split('T')[0])
        const res = await api.post('/uploads/master', formData)
        setUploadSuccess(res.data.message || `File ${uploadFile.name} berhasil diproses menjadi Data Master.`)
      } else if (uploadMode === 'KPI') {
        formData.append('jenis', 'kpi_planning')
        formData.append('tahun', tahun.toString())
        formData.append('triwulan', triwulan.toString())
        const res = await api.post('/uploads/report', formData)
        setUploadSuccess(res.data.message || `File KPI ${uploadFile.name} berhasil diunggah.`)
      }

      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchDirectorates()
      fetchOverviewStats(selectedDir)
      if (activeMainTab === 'DELEGASI') fetchDelegasi()
      if (activeMainTab === 'TIDAK_COACHING') fetchTidakCoaching()
    } catch (err: any) {
      let msg = 'Gagal memproses file.'
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail)
      } else if (err.message) {
        msg = err.message
      }
      setUploadError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const parseDelegasiRoles = (rawText: string | null) => {
    if (!rawText) return []
    const parts = rawText.split(' || ')
    return parts.map((part) => {
      const segs = part.split(' | ')
      let jbt = ''
      let bgn = ''
      let dpt = ''
      let kmp = ''
      segs.forEach((s) => {
        if (s.startsWith('Jabatan:')) jbt = s.replace('Jabatan:', '').trim()
        else if (s.startsWith('Bagian:')) bgn = s.replace('Bagian:', '').trim()
        else if (s.startsWith('Departemen:')) dpt = s.replace('Departemen:', '').trim()
        else if (s.startsWith('Kompartemen:')) kmp = s.replace('Kompartemen:', '').trim()
        else if (!jbt) jbt = s.trim()
      })
      return { jabatan: jbt || part, bagian: bgn || '-', departemen: dpt || '-', kompartemen: kmp || '-' }
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar (Directorate Filter) without Duplicate Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border-custom/50">
        <div>
          <p className="text-xs text-text-muted">
            Pusat visualisasi demografi karyawan, verifikasi purna tugas, pemantauan delegasi jabatan (Plt), dan audit coaching.
          </p>
        </div>

        {/* Directorate Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-muted whitespace-nowrap">Filter Direktorat:</span>
          <select
            value={selectedDir}
            onChange={(e) => setSelectedDir(e.target.value)}
            className="bg-bg-muted text-text-primary text-xs px-3 py-2 rounded-xl border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary max-w-[220px]"
          >
            <option value="ALL">Seluruh Direktorat</option>
            {directorates.map((dir) => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-text-muted">Total Karyawan</span>
          <h3 className="text-2xl font-black text-text-primary mt-1">{stats.total_karyawan}</h3>
          <span className="text-[10px] text-text-muted mt-1">Seluruh catatan data master</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Karyawan Aktif</span>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.aktif_count}</h3>
          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            {stats.total_karyawan > 0 ? `${Math.round((stats.aktif_count / stats.total_karyawan) * 100)}% dari total` : '-'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Delegasi (Plt)</span>
          <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.delegasi_count}</h3>
          <span className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-1">Penugasan rangkap</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Purna Tugas</span>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.purna_count}</h3>
          <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mt-1">Purna tugas terverifikasi</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">PKWT</span>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pkwt_count}</h3>
          <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1">Tenaga Kontrak</span>
        </div>
      </div>

      {/* Redesigned Clean Upload Section with Custom Choose File & Process Button */}
      <Card className="border-border-custom bg-bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <UploadIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Pusat Unggah Data & Verifikasi</CardTitle>
                <CardDescription className="text-xs">
                  Pilih modul data yang ingin diunggah lalu proses berkas Excel (.xlsx / .xls)
                </CardDescription>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-bg-muted border border-border-custom">
              <button
                onClick={() => { setUploadMode('MASTER'); setUploadFile(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  uploadMode === 'MASTER' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Data Karyawan
              </button>
              <button
                onClick={() => { setUploadMode('KPI'); setUploadFile(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  uploadMode === 'KPI' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Data KPI (Delegasi)
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-custom/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadFile(e.target.files[0])
                }
              }}
              className="hidden"
            />

            {/* Styled Choose File Box */}
            <div className="flex-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-bg-muted hover:bg-bg-hover text-text-primary border border-border-custom shadow-2xs hover:border-primary/50 transition-all cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span>Pilih File Excel</span>
              </button>

              {uploadFile ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-text-primary min-w-0 animate-in fade-in duration-150">
                  <FileCheck className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate max-w-xs">{uploadFile.name}</span>
                  <span className="text-[10px] text-text-muted font-mono shrink-0">
                    ({Math.round(uploadFile.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="p-0.5 rounded text-text-muted hover:text-rose-500 hover:bg-bg-muted ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-text-muted italic truncate">
                  Belum ada file dipilih ({uploadMode === 'MASTER' ? 'Format Data Karyawan' : 'Format Laporan KPI'})
                </span>
              )}
            </div>

            {/* Styled Process Button */}
            <Button
              onClick={handleProcessUpload}
              disabled={isUploading || !uploadFile}
              className="px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
            >
              {isUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UploadIcon className="w-4 h-4 mr-2" />
              )}
              {isUploading ? 'Memproses Berkas...' : 'Proses Data'}
            </Button>
          </div>

          {uploadSuccess && (
            <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{uploadSuccess}</span>
              </div>
              <button onClick={() => setUploadSuccess(null)} className="text-text-muted hover:text-text-primary px-1">✕</button>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
              <button onClick={() => setUploadError(null)} className="text-text-muted hover:text-text-primary px-1">✕</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('VISUALISASI')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'VISUALISASI'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-bg-muted text-text-secondary hover:text-text-primary'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>Visualisasi Demografi</span>
          </button>

          <button
            onClick={() => setActiveMainTab('DELEGASI')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'DELEGASI'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-bg-muted text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Data Delegasi (Plt) ({stats.delegasi_count})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('TIDAK_COACHING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'TIDAK_COACHING'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-bg-muted text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Data Belum Coaching ({stats.tidak_coaching_count || 0})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('PURNA')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'PURNA'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-bg-muted text-text-secondary hover:text-text-primary'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Purna Tugas ({stats.purna_count})</span>
          </button>
        </div>

        {/* Department Filter & Search Bar for Tables */}
        {activeMainTab !== 'VISUALISASI' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-bg-muted text-text-primary text-xs px-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
            >
              <option value="ALL_DEPT">Semua Departemen ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Nama / NIK..."
                className="w-full bg-bg-muted text-text-primary text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: VISUALISASI */}
      {activeMainTab === 'VISUALISASI' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart */}
            <Card className="lg:col-span-5 border-border-custom bg-bg-card flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Komposisi Status Pegawai
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribusi status aktual hasil verifikasi sistem
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                <div className="h-[220px] w-full relative">
                  {stats.status_distribution.length > 0 && stats.total_karyawan > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.status_distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={88}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {stats.status_distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                const pct = stats.total_karyawan > 0 ? Math.round((data.value / stats.total_karyawan) * 100) : 0
                                return (
                                  <div className="bg-bg-card border border-border-custom p-3 rounded-xl shadow-2xl text-xs space-y-1.5 z-50">
                                    <div className="flex items-center gap-2 font-bold text-text-primary text-xs">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
                                      <span>{data.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-5 text-text-secondary text-[11px]">
                                      <span>Jumlah:</span>
                                      <span className="font-mono font-bold text-text-primary">{data.value} orang</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-5 text-text-secondary text-[11px]">
                                      <span>Persentase:</span>
                                      <span className="font-mono font-bold text-primary">{pct}%</span>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-text-muted font-semibold tracking-wider uppercase">Total</span>
                        <span className="text-xl font-black text-text-primary font-mono">{stats.total_karyawan}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-text-muted">
                      Belum ada data tersedia.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-custom/60">
                  {stats.status_distribution.map((item, idx) => {
                    const pct = stats.total_karyawan > 0 ? Math.round((item.value / stats.total_karyawan) * 100) : 0
                    return (
                      <div key={idx} className="p-2 rounded-xl bg-bg-surface border border-border-custom/70 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-text-primary truncate text-[11px]">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0 font-mono">
                          <span className="font-bold text-text-primary">{item.value}</span>
                          <span className="text-[10px] text-text-muted ml-1">({pct}%)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Eselon Bar Chart */}
            <Card className="lg:col-span-7 border-border-custom bg-bg-card flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Distribusi Jenjang Eselon
                </CardTitle>
                <CardDescription className="text-xs">
                  Komposisi jumlah karyawan per tingkatan eselon jabatan
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center min-h-[300px]">
                {stats.eselon_distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.eselon_distribution} margin={{ top: 15, right: 15, left: -15, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            const pct = stats.total_karyawan > 0 ? Math.round((data.count / stats.total_karyawan) * 100) : 0
                            return (
                              <div className="bg-bg-card border border-border-custom p-3 rounded-xl shadow-2xl text-xs space-y-1.5 z-50">
                                <div className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-sm bg-primary shrink-0" />
                                  <span>{data.name}</span>
                                </div>
                                <div className="flex items-center justify-between gap-5 text-text-secondary text-[11px]">
                                  <span>Jumlah Karyawan:</span>
                                  <span className="font-mono font-bold text-primary">{data.count} orang</span>
                                </div>
                                <div className="flex items-center justify-between gap-5 text-text-secondary text-[11px]">
                                  <span>Porsi Organisasi:</span>
                                  <span className="font-mono font-bold text-text-primary">{pct}% dari total</span>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="count" name="Jumlah Karyawan" fill="#00a896" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-text-muted">
                    Belum ada data eselon.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Directorate Breakdown */}
          <Card className="border-border-custom bg-bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    Distribusi per Direktorat
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Proporsi dan sebaran jumlah karyawan pada masing-masing direktorat
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {stats.dir_distribution.length} Direktorat
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {stats.dir_distribution.map((dir, idx) => {
                  const pct = stats.total_karyawan > 0 ? Math.round((dir.count / stats.total_karyawan) * 100) : 0
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-bg-surface border border-border-custom/80 hover:border-primary/40 transition-all space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-text-primary truncate" title={dir.name}>
                            {dir.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-text-primary font-mono">{dir.count}</span>
                          <span className="text-[10px] text-text-muted ml-1">orang</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-text-muted">
                          <span>Porsi Organisasi</span>
                          <span className="font-semibold text-primary">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: DATA DELEGASI (PLT) */}
      {activeMainTab === 'DELEGASI' && (
        <Card className="border-border-custom bg-bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-500" />
              Daftar Karyawan Delegasi (Plt / Multi-Role)
            </CardTitle>
            <CardDescription className="text-xs">
              Karyawan dengan penugasan ganda yang terdeteksi dari kesamaan NIK/Nama pada data KPI ({delegasiList.length} orang)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border-custom overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-bg-muted/50 text-xs">
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>NIK / SAP</TableHead>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead className="whitespace-nowrap">Eselon</TableHead>
                    <TableHead>Posisi Utama</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Kompartemen</TableHead>
                    <TableHead className="w-32 text-center">Rincian Peran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTable ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                        Memuat data delegasi...
                      </TableCell>
                    </TableRow>
                  ) : delegasiList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                        Tidak ada data delegasi ditemukan sesuai filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    delegasiList
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((emp, index) => (
                        <TableRow key={emp.nik + index} className="text-xs hover:bg-bg-muted/30">
                          <TableCell className="text-center font-mono text-text-muted">
                            {(currentPage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-text-primary">{emp.nik}</span>
                          </TableCell>
                          <TableCell className="font-medium text-text-primary">
                            {emp.nama}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                              {emp.eselon || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-text-primary font-medium max-w-xs truncate" title={emp.postitle || emp.nm_jabatan || '-'}>
                            {emp.postitle || emp.nm_jabatan || '-'}
                          </TableCell>
                          <TableCell className="text-text-primary">{emp.departemen || '-'}</TableCell>
                          <TableCell className="text-text-muted text-[11px]">{emp.kompartemen || '-'}</TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => setSelectedDelegasiEmp(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            {delegasiList.length > pageSize && (
              <div className="flex items-center justify-between pt-4 text-xs text-text-muted">
                <span>Total {delegasiList.length} karyawan delegasi</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2 text-xs"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-3 py-1 font-semibold text-text-primary">
                    {currentPage} / {Math.ceil(delegasiList.length / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(delegasiList.length / pageSize), p + 1))}
                    disabled={currentPage >= Math.ceil(delegasiList.length / pageSize)}
                    className="h-8 px-2 text-xs"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: DATA TIDAK COACHING */}
      {activeMainTab === 'TIDAK_COACHING' && (
        <Card className="border-border-custom bg-bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserX className="w-5 h-5 text-orange-500" />
              Daftar Karyawan Belum Coaching
            </CardTitle>
            <CardDescription className="text-xs">
              Karyawan aktif yang belum melaksanakan sesi Performance Coaching Superior ({tidakCoachingList.length} orang)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border-custom overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-bg-muted/50 text-xs">
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>NIK / SAP</TableHead>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead className="whitespace-nowrap">Eselon</TableHead>
                    <TableHead>Jabatan / Posisi</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Kompartemen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTable ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-text-muted text-xs">
                        Memuat data tidak coaching...
                      </TableCell>
                    </TableRow>
                  ) : tidakCoachingList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-text-muted text-xs">
                        Seluruh karyawan aktif telah menyelesaikan coaching.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tidakCoachingList
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((emp, index) => (
                        <TableRow key={emp.nik + index} className="text-xs hover:bg-bg-muted/30">
                          <TableCell className="text-center font-mono text-text-muted">
                            {(currentPage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-text-primary">{emp.nik}</span>
                          </TableCell>
                          <TableCell className="font-medium text-text-primary">{emp.nama}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                              {emp.eselon || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-text-primary font-medium">{emp.postitle || emp.nm_jabatan || '-'}</TableCell>
                          <TableCell className="text-text-primary">{emp.departemen || '-'}</TableCell>
                          <TableCell className="text-text-muted text-[11px]">{emp.kompartemen || '-'}</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            {tidakCoachingList.length > pageSize && (
              <div className="flex items-center justify-between pt-4 text-xs text-text-muted">
                <span>Total {tidakCoachingList.length} karyawan belum coaching</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2 text-xs"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-3 py-1 font-semibold text-text-primary">
                    {currentPage} / {Math.ceil(tidakCoachingList.length / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(tidakCoachingList.length / pageSize), p + 1))}
                    disabled={currentPage >= Math.ceil(tidakCoachingList.length / pageSize)}
                    className="h-8 px-2 text-xs"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: PURNA TUGAS */}
      {activeMainTab === 'PURNA' && (
        <Card className="border-border-custom bg-bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Calendar className="w-5 h-5" />
                  Daftar Karyawan Purna Tugas
                </CardTitle>
                <CardDescription className="text-xs">
                  Karyawan yang statusnya berhasil dikoreksi menjadi Purna Bakti berdasarkan verifikasi tanggal purna tugas ({stats.purna_list.length} orang)
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 text-xs font-bold">
                {stats.purna_list.length} Purna Tugas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border-custom overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-bg-muted/50 text-xs">
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead className="whitespace-nowrap">Eselon</TableHead>
                    <TableHead>Jabatan Terakhir</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Kompartemen</TableHead>
                    <TableHead>Tgl Purna Tugas (tgl_pen)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.purna_list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-text-muted text-xs">
                        Tidak ada karyawan purna tugas yang terdata.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.purna_list.map((emp, idx) => (
                      <TableRow key={idx} className="text-xs hover:bg-bg-muted/30">
                        <TableCell className="text-center font-mono text-text-muted">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-bold text-text-primary">{emp.nik}</TableCell>
                        <TableCell className="font-semibold text-text-primary">{emp.nama}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap inline-block">{emp.eselon}</Badge>
                        </TableCell>
                        <TableCell className="text-text-primary font-medium">{emp.nm_jabatan}</TableCell>
                        <TableCell className="text-text-primary">{emp.departemen}</TableCell>
                        <TableCell className="text-text-muted text-[11px]">{emp.kompartemen}</TableCell>
                        <TableCell className="font-mono text-text-secondary font-medium">
                          {emp.tgl_pen ? String(emp.tgl_pen).substring(0, 10) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Pop-up Modal for Delegasi */}
      {selectedDelegasiEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-bg-card border border-border-custom rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-text-primary max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border-custom pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">{selectedDelegasiEmp.nama}</h3>
                  <p className="text-xs font-mono text-text-muted mt-0.5">
                    NIK: {selectedDelegasiEmp.nik} {selectedDelegasiEmp.nik_sap ? `| SAP: ${selectedDelegasiEmp.nik_sap}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDelegasiEmp(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Primary Role Card */}
              <div className="p-3.5 rounded-xl bg-bg-muted/60 border border-border-custom/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                    Posisi Utama / Definitif
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedDelegasiEmp.eselon || 'Eselon -'}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex">
                    <span className="w-28 text-text-muted font-medium">Jabatan:</span>
                    <span className="font-bold text-text-primary flex-1">{selectedDelegasiEmp.postitle || selectedDelegasiEmp.nm_jabatan || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-text-muted font-medium">Bagian:</span>
                    <span className="text-text-primary flex-1">{selectedDelegasiEmp.bagian || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-text-muted font-medium">Departemen:</span>
                    <span className="text-text-primary flex-1">{selectedDelegasiEmp.departemen || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-text-muted font-medium">Kompartemen:</span>
                    <span className="text-text-primary flex-1">{selectedDelegasiEmp.kompartemen || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-text-muted font-medium">Direktorat:</span>
                    <span className="text-text-primary flex-1">{selectedDelegasiEmp.direktorat || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Secondary Roles / Delegations */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                  Rincian Penugasan Rangkap / Delegasi / Plt
                </span>

                {parseDelegasiRoles(selectedDelegasiEmp.delegasi_posisi_lain).length > 0 ? (
                  parseDelegasiRoles(selectedDelegasiEmp.delegasi_posisi_lain).map((role, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1 text-xs"
                    >
                      <div className="flex">
                        <span className="w-28 text-text-muted font-medium">Jabatan Delegasi:</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 flex-1">{role.jabatan}</span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-text-muted font-medium">Bagian:</span>
                        <span className="text-text-primary flex-1">{role.bagian}</span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-text-muted font-medium">Departemen:</span>
                        <span className="text-text-primary flex-1">{role.departemen}</span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-text-muted font-medium">Kompartemen:</span>
                        <span className="text-text-primary flex-1">{role.kompartemen}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-text-muted">
                    {selectedDelegasiEmp.delegasi_posisi_lain || 'Informasi posisi delegasi tidak tersedia secara terinci.'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDelegasiEmp(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
