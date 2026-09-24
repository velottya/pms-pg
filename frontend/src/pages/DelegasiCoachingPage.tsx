import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldAlert,
  UserX,
  Upload as UploadIcon,
  Search,
  Building,
  HardHat,
  Eye,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import { usePeriod } from '../context/PeriodContext'

export const DelegasiCoachingPage: React.FC = () => {
  const { tahun, triwulan } = usePeriod()
  const [activeTab, setActiveTab] = useState<'DELEGASI' | 'TIDAK_COACHING'>('DELEGASI')
  const [delegasiList, setDelegasiList] = useState<any[]>([])
  const [tidakCoachingList, setTidakCoachingList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [directorates, setDirectorates] = useState<string[]>([])
  const [selectedDir, setSelectedDir] = useState<string>('ALL')
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('ALL_DEPT')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Upload States
  const [uploadType, setUploadType] = useState<'KPI' | 'COACHING' | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Modal State for Delegasi Detail
  const [selectedDelegasiEmp, setSelectedDelegasiEmp] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDirectorates()
    fetchDepartments()
    fetchData()
  }, [])

  useEffect(() => {
    fetchDepartments(selectedDir)
    fetchData()
  }, [selectedDir, selectedDept, search, activeTab])

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

  const fetchData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'DELEGASI') {
        let url = `/employees/delegasi?limit=5000`
        if (selectedDir !== 'ALL') url += `&direktorat=${encodeURIComponent(selectedDir)}`
        if (selectedDept !== 'ALL_DEPT') url += `&departemen=${encodeURIComponent(selectedDept)}`
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
        const res = await api.get(url)
        if (Array.isArray(res.data)) setDelegasiList(res.data)
      } else {
        let url = `/employees/tidak-coaching?limit=5000`
        if (selectedDir !== 'ALL') url += `&direktorat=${encodeURIComponent(selectedDir)}`
        if (selectedDept !== 'ALL_DEPT') url += `&departemen=${encodeURIComponent(selectedDept)}`
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`
        const res = await api.get(url)
        if (Array.isArray(res.data)) setTidakCoachingList(res.data)
      }
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching audit data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (type: 'kpi_planning' | 'coaching') => {
    if (!uploadFile) return
    setIsUploading(true)
    setUploadMessage(null)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('jenis', type)
    formData.append('tahun', tahun.toString())
    formData.append('triwulan', triwulan.toString())

    try {
      const res = await api.post('/uploads/report', formData)
      setUploadMessage(res.data.message || `File ${uploadFile.name} berhasil diunggah dan diproses.`)
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchData()
    } catch (err: any) {
      let msg = 'Gagal mengunggah file.'
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

  const currentList = activeTab === 'DELEGASI' ? delegasiList : tidakCoachingList
  const paginatedList = currentList.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(currentList.length / pageSize) || 1

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-primary" />
            Monitoring Delegasi (Plt) & Audit Tidak Coaching
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Pemeriksaan karyawan dengan penugasan rangkap (Plt / Delegasi) melalui data KPI dan karyawan aktif yang belum menyelesaikan sesi coaching.
          </p>
        </div>
      </div>

      {/* Upload Action Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload KPI Planning */}
        <Card className="border-border-custom bg-bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">1. Upload Data KPI (Deteksi Delegasi)</CardTitle>
                <CardDescription className="text-xs">
                  Mendeteksi duplikasi NIK/Nama dengan detail Jabatan, Bagian, Dept & Komp
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0])
                    setUploadType('KPI')
                  }
                }}
                className="text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
              />
              <Button
                size="sm"
                onClick={() => handleFileUpload('kpi_planning')}
                disabled={isUploading || !uploadFile || uploadType !== 'KPI'}
                className="text-xs shrink-0"
              >
                {isUploading && uploadType === 'KPI' ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <UploadIcon className="w-3.5 h-3.5 mr-1" />}
                Proses KPI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Coaching */}
        <Card className="border-border-custom bg-bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">2. Upload Data Coaching (Audit Coaching)</CardTitle>
                <CardDescription className="text-xs">
                  Mengidentifikasi karyawan aktif yang belum melaksanakan sesi coaching
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0])
                    setUploadType('COACHING')
                  }
                }}
                className="text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
              />
              <Button
                size="sm"
                onClick={() => handleFileUpload('coaching')}
                disabled={isUploading || !uploadFile || uploadType !== 'COACHING'}
                className="text-xs shrink-0"
              >
                {isUploading && uploadType === 'COACHING' ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <UploadIcon className="w-3.5 h-3.5 mr-1" />}
                Proses Coaching
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Notifications */}
      {uploadMessage && (
        <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{uploadMessage}</span>
          </div>
          <button onClick={() => setUploadMessage(null)} className="text-text-muted hover:text-text-primary px-1">✕</button>
        </div>
      )}

      {uploadError && (
        <div className="p-3 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-text-muted hover:text-text-primary px-1">✕</button>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border-border-custom bg-bg-card">
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold">
                {activeTab === 'DELEGASI' ? 'Daftar Karyawan Delegasi & Plt' : 'Daftar Karyawan Belum Coaching'}
              </CardTitle>
              <CardDescription className="text-xs">
                {activeTab === 'DELEGASI'
                  ? `Daftar terverifikasi penugasan multi-role (${delegasiList.length} orang)`
                  : `Daftar karyawan aktif belum melakukan coaching (${tidakCoachingList.length} orang)`}
              </CardDescription>
            </div>

            {/* Filter Tools */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-text-muted whitespace-nowrap">Direktorat:</span>
                <select
                  value={selectedDir}
                  onChange={(e) => setSelectedDir(e.target.value)}
                  className="bg-bg-muted text-text-primary text-xs px-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
                >
                  <option value="ALL">Semua Direktorat</option>
                  {directorates.map((dir) => (
                    <option key={dir} value={dir}>{dir}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-text-muted whitespace-nowrap">Departemen:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-bg-muted text-text-primary text-xs px-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary max-w-[210px]"
                >
                  <option value="ALL_DEPT">Semua Departemen ({departments.length} Dept)</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-52">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari Nama / NIK..."
                  className="w-full bg-bg-muted text-text-primary text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sub-Tabs Switcher */}
          <div className="grid grid-cols-2 gap-2 border-b border-border-custom pb-3 max-w-md">
            <button
              onClick={() => setActiveTab('DELEGASI')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'DELEGASI'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-bg-muted/80 text-text-secondary hover:text-text-primary'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Data Delegasi (Plt) ({delegasiList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('TIDAK_COACHING')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'TIDAK_COACHING'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-bg-muted/80 text-text-secondary hover:text-text-primary'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>Tidak Coaching ({tidakCoachingList.length})</span>
            </button>
          </div>

          {/* Table Content */}
          <div className="rounded-lg border border-border-custom overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-muted/50 text-xs">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>NIK / SAP</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Eselon</TableHead>
                  <TableHead>Jabatan / Posisi</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Kompartemen</TableHead>
                  {activeTab === 'DELEGASI' ? (
                    <TableHead className="w-32 text-center">Detail Peran</TableHead>
                  ) : (
                    <TableHead className="w-28 text-center">Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                      Tidak ada data ditemukan sesuai filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((emp, index) => (
                    <TableRow key={emp.nik + index} className="text-xs hover:bg-bg-muted/30">
                      <TableCell className="text-center font-mono text-text-muted">
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-text-primary">{emp.nik}</span>
                        {emp.nik_sap && emp.nik_sap !== emp.nik && (
                          <span className="block text-[10px] text-text-muted font-mono">{emp.nik_sap}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-text-primary">
                        {emp.nama}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {emp.eselon || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-primary font-medium max-w-xs truncate" title={emp.postitle || emp.nm_jabatan || '-'}>
                        {emp.postitle || emp.nm_jabatan || '-'}
                      </TableCell>
                      <TableCell className="text-text-primary">
                        {emp.departemen || '-'}
                      </TableCell>
                      <TableCell className="text-text-muted text-[11px] truncate max-w-xs">
                        {emp.kompartemen || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {activeTab === 'DELEGASI' ? (
                          <button
                            onClick={() => setSelectedDelegasiEmp(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detail
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            Belum Coaching
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-text-muted">
              <span>
                Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, currentList.length)} dari {currentList.length} baris
              </span>
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
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2 text-xs"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors"
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
