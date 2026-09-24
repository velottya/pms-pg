import React, { useState, useRef, useEffect } from 'react'
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCheck,
  ClipboardList,
  Building,
  HardHat,
  Search,
  ShieldAlert,
  UserX,
  Layers,
  Users,
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'

export const MasterConversionPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    total_rows: number
    aktif_count: number
    tidak_coaching_count: number
    pkwt_count: number
    purna_count: number
    pi_count: number
    delegasi_count: number
    dept_count: number
  }>({
    total_rows: 0,
    aktif_count: 0,
    tidak_coaching_count: 0,
    pkwt_count: 0,
    purna_count: 0,
    pi_count: 0,
    delegasi_count: 0,
    dept_count: 0,
  })
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'ALL' | 'AKTIF' | 'PI' | 'REKAP'>('ALL')
  const [employees, setEmployees] = useState<any[]>([])
  const [rekapRows, setRekapRows] = useState<any[]>([])
  const [directorates, setDirectorates] = useState<string[]>([])
  const [selectedDir, setSelectedDir] = useState<string>('ALL')
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('ALL_DEPT')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const fileInputRef = useRef<HTMLInputElement>(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

  useEffect(() => {
    fetchDirectorates()
    fetchMasterSummary()
  }, [])

  useEffect(() => {
    fetchDepartments(selectedDir)
    fetchMasterSummary(selectedDir)
  }, [selectedDir])

  useEffect(() => {
    if (activeTab === 'REKAP') {
      fetchRekap()
    } else {
      fetchEmployees(activeTab)
    }
  }, [activeTab, search, selectedDir, selectedDept])

  const fetchDirectorates = async () => {
    try {
      const res = await api.get('/employees/directorates?source=CONVERSION')
      if (Array.isArray(res.data)) {
        setDirectorates(res.data)
      }
    } catch (err) {
      console.error('Error fetching directorates:', err)
    }
  }

  const fetchDepartments = async (dir: string = 'ALL') => {
    try {
      let url = '/employees/departments?kategori=ALL&source=CONVERSION'
      if (dir && dir !== 'ALL') {
        url += `&direktorat=${encodeURIComponent(dir)}`
      }
      const res = await api.get(url)
      if (Array.isArray(res.data)) {
        setDepartments(res.data)
      }
      // Reset selected department when directorate changes
      setSelectedDept('ALL_DEPT')
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchMasterSummary = async (dir: string = 'ALL') => {
    try {
      let url = '/employees/summary'
      if (dir && dir !== 'ALL') {
        url += `?direktorat=${encodeURIComponent(dir)}`
      }
      const res = await api.get(url)
      if (res.data) {
        setSummary(res.data)
      }
    } catch (err) {
      console.error('Error fetching master summary:', err)
    }
  }

  const fetchEmployees = async (kat: string) => {
    try {
      let url = kat === 'ALL' ? `/employees/master?source=CONVERSION&limit=5000` : `/employees/master?source=CONVERSION&kategori=${kat}&limit=5000`
      if (selectedDir && selectedDir !== 'ALL') url += `&direktorat=${encodeURIComponent(selectedDir)}`
      if (selectedDept && selectedDept !== 'ALL_DEPT') url += `&departemen=${encodeURIComponent(selectedDept)}`
      if (search) url += `&search=${encodeURIComponent(search)}`
      const res = await api.get(url)
      setEmployees(res.data)
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching master preview:', err)
    }
  }

  const fetchRekap = async () => {
    try {
      let url = '/employees/rekap-departemen?source=CONVERSION'
      if (selectedDir && selectedDir !== 'ALL') {
        url += `&direktorat=${encodeURIComponent(selectedDir)}`
      }
      const res = await api.get(url)
      let rows = res.data.rekap || []
      if (selectedDept && selectedDept !== 'ALL_DEPT') {
        rows = rows.filter((r: any) => r.departemen === selectedDept)
      }
      setRekapRows(rows)
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching rekap departemen:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
      setSuccessMessage(null)
    }
  }

  const handleProcess = async () => {
    if (!file) {
      setError('Pilih file Excel terlebih dahulu.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source', 'CONVERSION')
      formData.append('snapshot_date_str', new Date().toISOString().split('T')[0])
      const res = await api.post('/uploads/master', formData)
      
      setSuccessMessage(res.data.message || `File ${file.name} berhasil diproses menjadi Data Master.`)
      fetchMasterSummary(selectedDir)
      fetchDirectorates()
      fetchDepartments(selectedDir)
      
      if (activeTab === 'REKAP') fetchRekap()
      else fetchEmployees(activeTab)
    } catch (err: any) {
      let errMsg = 'Gagal memproses file.'
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errMsg = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          errMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
        } else {
          errMsg = JSON.stringify(err.response.data.detail)
        }
      } else if (err.message) {
        errMsg = err.message
      }
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadAllMasterExcel = () => {
    window.open(`${apiBaseUrl}/employees/export-master-excel`, '_blank')
  }

  const handleDownloadDirectorateExcel = (dir: string) => {
    if (!dir || dir === 'ALL') {
      window.open(`${apiBaseUrl}/employees/export-master-excel`, '_blank')
    } else {
      window.open(`${apiBaseUrl}/employees/export-master-excel?direktorat=${encodeURIComponent(dir)}`, '_blank')
    }
  }

  const totalPages = Math.ceil((activeTab === 'REKAP' ? rekapRows.length : employees.length) / pageSize) || 1
  const paginatedEmployees = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paginatedRekap = rekapRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      {/* Top Action Bar without Duplicate Title */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-border-custom/50">
        <div>
          <p className="text-xs text-text-muted">
            Otomatisasi pengolahan file menjadi Master Data bersih per Kompartemen & Kategori Khusus
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Per Direktorat with Selector */}
          <div className="flex items-center gap-1.5 bg-bg-card p-1 rounded-xl border border-border-custom shadow-xs">
            <select
              value={selectedDir}
              onChange={(e) => setSelectedDir(e.target.value)}
              className="bg-bg-muted text-text-primary text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px] sm:max-w-[220px]"
            >
              <option value="ALL">Pilih Direktorat...</option>
              {directorates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedDir === 'ALL'}
              onClick={() => handleDownloadDirectorateExcel(selectedDir)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5"
              title={selectedDir === 'ALL' ? 'Pilih salah satu direktorat terlebih dahulu' : `Unduh data ${selectedDir}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Per Direktorat</span>
            </Button>
          </div>

          {/* Download All (Gabungan Semua Direktorat) */}
          <Button
            variant="default"
            onClick={handleDownloadAllMasterExcel}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white shadow-sm text-xs font-semibold px-3.5 py-2"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Semua (Semua Direktorat)</span>
          </Button>
        </div>
      </div>

      {/* Upload Box */}
      <Card className="border-border-custom bg-bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <UploadIcon className="w-5 h-5 text-primary" />
            Upload File Mentah Original (HRIS)
          </CardTitle>
          <CardDescription className="text-xs">
            Unggah file Excel apa adanya. Backend secara otomatis menstandarkan nama departemen/kompartemen, mendeteksi delegasi, dan mengklasifikasikan status pegawai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-dashed border-border-custom hover:border-primary/50 transition-colors p-6 rounded-xl bg-bg-muted/30 flex flex-col items-center justify-center text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileSpreadsheet className="w-12 h-12 text-text-muted mb-2 stroke-1" />
            <p className="text-sm font-medium text-text-primary">
              {file ? file.name : 'Pilih atau drop file Master Excel di sini'}
            </p>
            <p className="text-xs text-text-muted mt-1">Format didukung: .xlsx, .xls</p>

            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? 'Ganti File' : 'Browse File'}
              </Button>
              <Button
                type="button"
                disabled={!file || isLoading}
                onClick={handleProcess}
                variant="default"
                size="md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Sedang Memproses...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 mr-2" />
                    Proses Menjadi Data Master
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-xs bg-danger-bg text-danger border border-danger/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-text-muted hover:text-text-primary px-2 py-0.5 text-xs rounded hover:bg-bg-muted"
              >
                ✕
              </button>
            </div>
          )}

          {/* Symmetrical & Compact Clean Overview Bar */}
          {summary.total_rows > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-bg-surface border border-border-custom shadow-xs">
              <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-bg-muted/50 border border-border-custom/60 text-center">
                <span className="text-[11px] text-text-muted font-medium">Total Baris</span>
                <span className="text-sm font-bold text-text-primary mt-0.5">{summary.total_rows}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Karyawan Aktif</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{summary.aktif_count}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-center">
                <span className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">Penugasan PI</span>
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400 mt-0.5">{summary.pi_count}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">Rekap Dept</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-0.5">{summary.dept_count || rekapRows.length || 0}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Clean Data with Tabs */}
      <Card className="border-border-custom bg-bg-card">
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold">Preview Master Data Bersih</CardTitle>
              <CardDescription className="text-xs">
                {activeTab === 'REKAP'
                  ? `Rekapitulasi ${rekapRows.length} Departemen ${selectedDept !== 'ALL_DEPT' ? `(Filter: ${selectedDept})` : '(Seluruh Departemen)'}`
                  : `Hasil klasifikasi siap pakai (${employees.length} baris)`}
              </CardDescription>
            </div>
            
            {/* Filter Tools: Directorate Selector, Department Selector & Search */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Directorate Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-text-muted whitespace-nowrap">Direktorat:</span>
                <select
                  value={selectedDir}
                  onChange={(e) => setSelectedDir(e.target.value)}
                  className="bg-bg-muted text-text-primary text-xs px-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary max-w-[210px]"
                >
                  <option value="ALL">Semua Direktorat</option>
                  {directorates.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-text-muted whitespace-nowrap">Departemen:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-bg-muted text-text-primary text-xs px-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary max-w-[220px]"
                >
                  <option value="ALL_DEPT">Semua Departemen ({departments.length} Dept)</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              {activeTab !== 'REKAP' && (
                <div className="relative w-full sm:w-48">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari Nama / NIK..."
                    className="w-full bg-bg-muted text-text-primary text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border-custom pb-3 w-full">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all duration-150 ${
                activeTab === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
                  : 'bg-bg-muted/80 hover:bg-bg-muted text-text-secondary hover:text-text-primary border border-border-custom/60'
              }`}
            >
              <Users className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'ALL' ? 'text-primary-foreground' : 'text-text-muted'}`} />
              <span className="truncate">Total Baris {summary.total_rows > 0 ? `(${summary.total_rows})` : ''}</span>
            </button>
            <button
              onClick={() => setActiveTab('AKTIF')}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all duration-150 ${
                activeTab === 'AKTIF'
                  ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
                  : 'bg-bg-muted/80 hover:bg-bg-muted text-text-secondary hover:text-text-primary border border-border-custom/60'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'AKTIF' ? 'text-primary-foreground' : 'text-emerald-500'}`} />
              <span className="truncate">Karyawan Aktif {summary.aktif_count > 0 ? `(${summary.aktif_count})` : ''}</span>
            </button>
            <button
              onClick={() => setActiveTab('PI')}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all duration-150 ${
                activeTab === 'PI'
                  ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
                  : 'bg-bg-muted/80 hover:bg-bg-muted text-text-secondary hover:text-text-primary border border-border-custom/60'
              }`}
            >
              <HardHat className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'PI' ? 'text-primary-foreground' : 'text-sky-500'}`} />
              <span className="truncate">Penugasan PI {summary.pi_count > 0 ? `(${summary.pi_count})` : ''}</span>
            </button>
            <button
              onClick={() => setActiveTab('REKAP')}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all duration-150 ${
                activeTab === 'REKAP'
                  ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
                  : 'bg-bg-muted/80 hover:bg-bg-muted text-text-secondary hover:text-text-primary border border-border-custom/60'
              }`}
            >
              <Layers className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'REKAP' ? 'text-primary-foreground' : 'text-purple-500'}`} />
              <span className="truncate">Rekap Departemen {summary.dept_count > 0 ? `(${summary.dept_count})` : ''}</span>
            </button>
          </div>

          {activeTab === 'REKAP' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Kompartemen</TableHead>
                  <TableHead className="text-center font-bold">Total Karyawan</TableHead>
                  <TableHead className="text-center text-emerald-600 dark:text-emerald-400">KPI Approved</TableHead>
                  <TableHead className="text-center text-amber-600 dark:text-amber-400">Coaching Sudah</TableHead>
                  <TableHead className="text-center text-rose-600 dark:text-rose-400">Coaching Belum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rekapRows.length > 0 ? (
                  rekapRows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center font-mono">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-text-primary">{r.departemen}</TableCell>
                      <TableCell className="text-text-muted">{r.kompartemen || '-'}</TableCell>
                      <TableCell className="text-center font-bold">{r.total}</TableCell>
                      <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{r.kpi_approved}</TableCell>
                      <TableCell className="text-center text-amber-600 dark:text-amber-400 font-semibold">{r.coaching_sudah}</TableCell>
                      <TableCell className="text-center text-rose-600 dark:text-rose-400 font-semibold">{r.coaching_belum}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-text-muted text-xs">
                      Tidak ada data rekap departemen.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>NIK / SAP</TableHead>
                  <TableHead>Jabatan & Eselon</TableHead>
                  <TableHead>Kompartemen / Departemen</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((emp, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-text-primary">
                          {emp.nama}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {emp.nik} {emp.nik_sap && emp.nik_sap !== emp.nik ? `(${emp.nik_sap})` : ''}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-medium text-text-primary">{emp.nm_jabatan || '-'}</p>
                          <p className="text-[11px] text-text-muted">{emp.eselon || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-medium text-text-primary">{emp.kompartemen || '-'}</p>
                          <p className="text-[11px] text-text-muted">{emp.departemen || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            emp.kategori === 'AKTIF'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : emp.kategori === 'PKWT'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : emp.kategori === 'PURNA'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : emp.kategori === 'PI'
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                              : ''
                          }
                        >
                          {emp.kategori === 'PURNA' ? 'PURNA BAKTI' : emp.kategori}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-text-muted text-xs">
                      Tidak ada data karyawan pada kategori ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border-custom text-xs">
              <span className="text-text-muted">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
