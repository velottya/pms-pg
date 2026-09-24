import React, { useState, useEffect } from 'react'
import {
  UserX,
  Search,
  Building,
  HardHat,
  FileSpreadsheet,
  Download,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'

export const TidakCoachingPage: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [directorates, setDirectorates] = useState<string[]>([])
  const [selectedDir, setSelectedDir] = useState<string>('ALL')
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('ALL_DEPT')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  useEffect(() => {
    fetchDirectorates()
    fetchDepartments()
  }, [])

  useEffect(() => {
    fetchDepartments(selectedDir)
    fetchTidakCoaching()
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

  const fetchTidakCoaching = async () => {
    setIsLoading(true)
    try {
      let url = `/employees/tidak-coaching?limit=5000`
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
      console.error('Error fetching tidak coaching data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const paginatedEmployees = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil(employees.length / pageSize) || 1

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-custom pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <UserX className="w-7 h-7 text-orange-500" />
            Data Karyawan Tidak Coaching
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Monitoring karyawan aktif yang belum melaksanakan atau belum terekam dalam sesi Performance Coaching Superior.
          </p>
        </div>
      </div>

      {/* Summary Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Total Belum Coaching</span>
            <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-0.5">{employees.length}</h3>
          </div>
          <AlertTriangle className="w-8 h-8 text-orange-500/60" />
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
              <CardTitle className="text-base font-bold">Daftar Karyawan Belum Coaching</CardTitle>
              <CardDescription className="text-xs">
                Data real-time karyawan aktif yang belum menyelesaikan sesi coaching ({employees.length} orang)
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
                  placeholder="Cari Nama / NIK..."
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
                  <TableHead>Posisi / Jabatan</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Kompartemen</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                      Memuat data tidak coaching...
                    </TableCell>
                  </TableRow>
                ) : paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                      Tidak ada karyawan tidak coaching ditemukan sesuai filter.
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                          Belum Coaching
                        </span>
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
    </div>
  )
}
