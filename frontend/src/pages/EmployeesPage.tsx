import React, { useEffect, useState } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Users,
  ShieldAlert,
  FileText,
  CheckCircle2,
  BarChart3,
  ClipboardList,
  Building,
  HardHat,
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { api } from '../lib/api'

export const EmployeesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rekap' | 'AKTIF' | 'PKWT' | 'PURNA' | 'PI'>('rekap')
  const [employees, setEmployees] = useState<any[]>([])
  const [rekapData, setRekapData] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRekap()
    if (activeTab !== 'rekap') {
      fetchEmployees(activeTab)
    }
  }, [activeTab, search])

  const fetchRekap = async () => {
    try {
      const res = await api.get('/employees/rekap')
      setRekapData(res.data)
    } catch (err) {
      console.error('Error fetching rekap:', err)
    }
  }

  const fetchEmployees = async (kategori: string) => {
    setIsLoading(true)
    try {
      const res = await api.get(
        `/employees/master?kategori=${kategori}${search ? `&search=${encodeURIComponent(search)}` : ''}&limit=500`
      )
      setEmployees(res.data)
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching master employees:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const totalPages = Math.ceil(employees.length / pageSize) || 1
  const paginatedEmployees = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getKategoriBadge = (kat: string) => {
    switch (kat) {
      case 'AKTIF':
        return <Badge variant="success">AKTIF (Tetap)</Badge>
      case 'PKWT':
        return <Badge variant="warning">PKWT / Pro-Hire</Badge>
      case 'PURNA':
        return <Badge variant="danger">Purna Bakti / Pensiun</Badge>
      case 'PI':
        return <Badge variant="info">Penugasan PI</Badge>
      default:
        return <Badge variant="secondary">{kat}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-border-custom/50">
        <p className="text-xs text-text-muted">
          Hasil otomatisasi pipeline cleaning dari data original HRIS (Pengganti pemilahan manual tab Excel)
        </p>
      </div>

      {/* Tabs Filter with Clean Icons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-custom pb-3">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'rekap'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Rekap Jumlah Karyawan</span>
        </button>
        <button
          onClick={() => setActiveTab('AKTIF')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'AKTIF'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Karyawan Aktif (DOP) ({rekapData?.total_aktif || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('PKWT')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'PKWT'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
          <span>PKWT ({rekapData?.total_pkwt || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('PURNA')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'PURNA'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-rose-500" />
          <span>Purna Bakti ({rekapData?.total_purna || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('PI')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'PI'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <HardHat className="w-3.5 h-3.5 text-sky-500" />
          <span>Penugasan PI ({rekapData?.total_pi || 0})</span>
        </button>
      </div>

      {activeTab === 'rekap' ? (
        /* Rekap Table View */
        <Card className="border-border-custom bg-bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold">Rekapitulasi Kategori Karyawan per Unit Organisasi</CardTitle>
            <CardDescription className="text-xs">
              Kalkulasi otomatis per direktorat & kompartemen dari Master Data snapshot terkini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Direktorat</TableHead>
                  <TableHead>Kompartemen</TableHead>
                  <TableHead className="text-center text-emerald-500">Aktif</TableHead>
                  <TableHead className="text-center text-amber-500">PKWT</TableHead>
                  <TableHead className="text-center text-rose-500">Purna</TableHead>
                  <TableHead className="text-center text-sky-500">PI</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rekapData?.rekap && rekapData.rekap.length > 0 ? (
                  rekapData.rekap.map((r: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-text-primary">{r.direktorat}</TableCell>
                      <TableCell className="text-text-secondary">{r.kompartemen}</TableCell>
                      <TableCell className="text-center text-success font-semibold">{r.aktif}</TableCell>
                      <TableCell className="text-center text-warning font-semibold">{r.pkwt}</TableCell>
                      <TableCell className="text-center text-danger font-semibold">{r.purna}</TableCell>
                      <TableCell className="text-center text-info font-semibold">{r.pi}</TableCell>
                      <TableCell className="text-right font-bold text-text-primary">{r.total}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                      Belum ada data Master yang diunggah. Silakan upload Master File di modul Planning.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Kategori Detail Table View */
        <Card className="border-border-custom bg-bg-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold">Daftar Karyawan — Kategori {activeTab}</CardTitle>
                <CardDescription className="text-xs">
                  {employees.length} baris data terklasifikasi
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari Nama / NIK..."
                  className="w-full bg-bg-muted text-text-primary text-xs pl-9 pr-3 py-2 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>NIK / SAP</TableHead>
                  <TableHead>Jabatan & Eselon</TableHead>
                  <TableHead>Kompartemen / Dept</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((emp, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-text-primary flex items-center gap-1.5">
                          {emp.nama}
                          {emp.is_delegasi && (
                            <span
                              title={`Delegasi: ${emp.delegasi_posisi_lain || '-'}`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30"
                            >
                              <ShieldAlert className="w-3 h-3" /> Delegasi
                            </span>
                          )}
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
                      <TableCell className="text-center">{getKategoriBadge(emp.kategori)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-muted text-xs">
                      {isLoading ? 'Memuat data...' : 'Tidak ada catatan karyawan.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

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
      )}
    </div>
  )
}
