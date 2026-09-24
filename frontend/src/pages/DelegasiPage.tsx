import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Search,
  Building,
  HardHat,
  Eye,
  X,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'

export const DelegasiPage: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [directorates, setDirectorates] = useState<string[]>([])
  const [selectedDir, setSelectedDir] = useState<string>('ALL')
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('ALL_DEPT')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Modal State for Delegasi Detail
  const [selectedDelegasiEmp, setSelectedDelegasiEmp] = useState<any | null>(null)

  useEffect(() => {
    fetchDirectorates()
    fetchDepartments()
  }, [])

  useEffect(() => {
    fetchDepartments(selectedDir)
    fetchDelegasi()
  }, [selectedDir, selectedDept, search])

  const fetchDirectorates = async () => {
    try {
      const res = await api.get('/employees/directorates')
      if (Array.isArray(res.data)) {
        setDirectorates(res.data)
      }
    } catch (err) {
      console.error('Error fetching directorates:', err)
    }
  }

  const fetchDepartments = async (dir: string = 'ALL') => {
    try {
      let url = '/employees/departments?kategori=ALL'
      if (dir && dir !== 'ALL') {
        url += `&direktorat=${encodeURIComponent(dir)}`
      }
      const res = await api.get(url)
      if (Array.isArray(res.data)) {
        setDepartments(res.data)
      }
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchDelegasi = async () => {
    setIsLoading(true)
    try {
      let url = `/employees/delegasi?limit=5000`
      if (selectedDir !== 'ALL') {
        url += `&direktorat=${encodeURIComponent(selectedDir)}`
      }
      if (selectedDept !== 'ALL_DEPT') {
        url += `&departemen=${encodeURIComponent(selectedDept)}`
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`
      }
      const res = await api.get(url)
      if (Array.isArray(res.data)) {
        setEmployees(res.data)
        setCurrentPage(1)
      }
    } catch (err) {
      console.error('Error fetching delegasi data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Parse delegasi info into structured cards
  const parseDelegasiRoles = (rawText: string | null) => {
    if (!rawText) return []
    const parts = rawText.split(' || ')
    return parts.map((part) => {
      const segs = part.split(' | ')
      let jbt = ''
      let dpt = ''
      let kmp = ''
      segs.forEach((s) => {
        if (s.startsWith('Jabatan:')) jbt = s.replace('Jabatan:', '').trim()
        else if (s.startsWith('Departemen:')) dpt = s.replace('Departemen:', '').trim()
        else if (s.startsWith('Kompartemen:')) kmp = s.replace('Kompartemen:', '').trim()
        else if (!jbt) jbt = s.trim()
      })
      return { jabatan: jbt || part, departemen: dpt || '-', kompartemen: kmp || '-' }
    })
  }

  const paginatedEmployees = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(employees.length / pageSize) || 1

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-indigo-500" />
            Data Karyawan Delegasi (Plt / Multi-Role)
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Monitoring karyawan yang memegang penugasan rangkap, Plt, delegasi jabatan lain, atau duplikasi peran pada sistem.
          </p>
        </div>
      </div>

      {/* Summary Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Total Karyawan Delegasi</span>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{employees.length}</h3>
          </div>
          <ShieldAlert className="w-8 h-8 text-indigo-500/60" />
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-border-custom flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted">Filter Direktorat</span>
            <h3 className="text-sm font-bold text-text-primary mt-1 truncate max-w-[200px]">
              {selectedDir === 'ALL' ? 'Seluruh Direktorat' : selectedDir}
            </h3>
          </div>
          <Building className="w-7 h-7 text-text-muted/40" />
        </div>

        <div className="p-4 rounded-xl bg-bg-card border border-border-custom flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted">Filter Departemen</span>
            <h3 className="text-sm font-bold text-text-primary mt-1 truncate max-w-[200px]">
              {selectedDept === 'ALL_DEPT' ? 'Seluruh Departemen' : selectedDept}
            </h3>
          </div>
          <HardHat className="w-7 h-7 text-text-muted/40" />
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-border-custom bg-bg-card">
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold">Daftar Karyawan Delegasi & Plt</CardTitle>
              <CardDescription className="text-xs">
                Daftar terverifikasi karyawan dengan penugasan ganda ({employees.length} orang)
              </CardDescription>
            </div>

            {/* Filter Tools */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
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

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari Nama / NIK / Posisi..."
                  className="w-full bg-bg-muted text-text-primary text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border-custom overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-muted/50 text-xs">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>NIK / SAP</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Eselon</TableHead>
                  <TableHead>Posisi Utama</TableHead>
                  <TableHead>Departemen / Unit</TableHead>
                  <TableHead className="w-36 text-center">Info Delegasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-text-muted text-xs">
                      Memuat data delegasi...
                    </TableCell>
                  </TableRow>
                ) : paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-text-muted text-xs">
                      Tidak ada karyawan delegasi ditemukan sesuai filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((emp, index) => (
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
                        <div className="flex items-center gap-1.5">
                          <span>{emp.nama}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                            Plt / Delegasi
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {emp.eselon || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-primary font-medium max-w-xs truncate" title={emp.postitle || emp.nm_jabatan || '-'}>
                        {emp.postitle || emp.nm_jabatan || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-text-primary font-medium">{emp.departemen || '-'}</div>
                        <div className="text-[10px] text-text-muted truncate max-w-xs">{emp.kompartemen || '-'}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => setSelectedDelegasiEmp(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Posisi
                        </button>
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
                Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, employees.length)} dari {employees.length} baris
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
                    Posisi Utama (Master Data)
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
