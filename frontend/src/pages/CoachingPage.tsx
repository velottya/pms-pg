import React, { useEffect, useState } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Search, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { UploadPanel } from '../components/UploadPanel'
import { SummaryCards, SummaryCardItem } from '../components/SummaryCards'
import { DownloadReportButton } from '../components/DownloadReportButton'
import { usePeriod } from '../context/PeriodContext'
import { api } from '../lib/api'

export const CoachingPage: React.FC = () => {
  const { tahun, triwulan, refreshKey } = usePeriod()

  const [summary, setSummary] = useState<any>(null)
  const [details, setDetails] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [tahun, triwulan, refreshKey, selectedDept, search])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [sumRes, detRes] = await Promise.all([
        api.get(`/coaching/summary?tahun=${tahun}&triwulan=${triwulan}`),
        api.get(`/coaching/detail?tahun=${tahun}&triwulan=${triwulan}${selectedDept ? `&departemen=${encodeURIComponent(selectedDept)}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
      ])
      setSummary(sumRes.data)
      setDetails(detRes.data)
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching coaching data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const totalEmployees = summary?.total_employees || 0
  const deptCount = summary?.total_departments || summary?.per_departemen?.length || 0
  const submittedCount = (summary?.approved_count || 0) + (summary?.waiting_approval_count || 0) + (summary?.drafted_count || 0)
  const submittedPct = totalEmployees > 0 ? (submittedCount / totalEmployees) * 100 : 0

  const summaryCards: SummaryCardItem[] = [
    {
      label: 'Total Karyawan',
      value: totalEmployees,
      subtext: `${deptCount} Departments`,
      icon: 'users',
      variant: 'default',
    },
    {
      label: 'Approved (Lengkap)',
      value: summary?.approved_count ?? 0,
      percentage: summary?.approved_pct ?? 0,
      subtext: 'of Total',
      icon: 'check',
      variant: 'success',
    },
    {
      label: 'Waiting Approval',
      value: summary?.waiting_approval_count ?? 0,
      percentage: summary?.waiting_approval_pct ?? 0,
      subtext: 'of Total',
      icon: 'clock',
      variant: 'warning',
    },
    {
      label: 'Drafted',
      value: summary?.drafted_count ?? 0,
      percentage: summary?.drafted_pct ?? 0,
      subtext: 'of Total',
      icon: 'alert',
      variant: 'info',
    },
    {
      label: 'Not Yet Submitted',
      value: summary?.not_yet_submitted_count ?? 0,
      percentage: summary?.not_yet_submitted_pct ?? 0,
      subtext: 'of Total',
      icon: 'cross',
      variant: 'danger',
    },
  ]

  const chartData = {
    labels: ['Approved', 'Waiting Approval', 'Drafted', 'Not Yet Submitted'],
    datasets: [
      {
        data: [
          summary?.approved_pct || 0,
          summary?.waiting_approval_pct || 0,
          summary?.drafted_pct || 0,
          summary?.not_yet_submitted_pct || 0,
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 8,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${ctx.raw}%`,
        },
      },
    },
    cutout: '72%',
  }

  const totalPages = Math.ceil(details.length / pageSize) || 1
  const paginatedDetails = details.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return <Badge variant="success">Approved</Badge>
    if (status.includes('Wait')) return <Badge variant="warning">Waiting Approval</Badge>
    if (status.includes('Draft')) return <Badge variant="info">Drafted</Badge>
    return <Badge variant="danger">Not Yet Submitted</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Upload Slot */}
      <UploadPanel currentModule="coaching" moduleLabel="Report Coaching Superior" />

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Performance Coaching Superior</h3>
          <p className="text-xs text-text-muted">
            Monitoring sesi pembinaan & bimbingan atasan (Tahun {tahun} TW {triwulan})
          </p>
        </div>
        <DownloadReportButton modul="coaching" />
      </div>

      {/* KPI Cards */}
      <SummaryCards items={summaryCards} />

      {/* Chart & Department Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart with Centered Metric and Symmetrical Legend */}
        <Card className="border-border-custom bg-bg-card flex flex-col justify-between">
          <CardHeader className="p-4 border-b border-border-custom/50">
            <CardTitle className="text-sm font-bold">Overall Coaching Status</CardTitle>
            <CardDescription className="text-xs">Distribusi status pelaksanaan coaching</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            {totalEmployees > 0 ? (
              <>
                <div className="flex-1 flex items-center justify-center py-2">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <Doughnut data={chartData} options={chartOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-text-primary tracking-tight">
                        {submittedPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </span>
                      <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                        SUBMITTED
                      </span>
                      <span className="text-[10px] text-text-muted mt-0.5">
                        {submittedCount.toLocaleString('id-ID')} / {totalEmployees.toLocaleString('id-ID')} Karyawan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-custom/50">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span className="text-text-secondary truncate">Approved</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{summary?.approved_count ?? 0}</span>{' '}
                        <span className="text-emerald-500 font-semibold">
                          ({(summary?.approved_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                        <span className="text-text-secondary truncate">Wait Apv</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{summary?.waiting_approval_count ?? 0}</span>{' '}
                        <span className="text-amber-500 font-semibold">
                          ({(summary?.waiting_approval_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 flex-shrink-0"></span>
                        <span className="text-text-secondary truncate">Drafted</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{summary?.drafted_count ?? 0}</span>{' '}
                        <span className="text-sky-500 font-semibold">
                          ({(summary?.drafted_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                        <span className="text-text-secondary truncate">NY Submit</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{summary?.not_yet_submitted_count ?? 0}</span>{' '}
                        <span className="text-rose-500 font-semibold">
                          ({(summary?.not_yet_submitted_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-center text-text-muted text-xs">
                Belum ada data coaching untuk periode ini.<br />Silakan upload file report.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Summary Table - Compact No Horizontal Scroll */}
        <Card className="border-border-custom bg-bg-card lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border-custom/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Ringkasan per Departemen</CardTitle>
                <CardDescription className="text-xs">Pencapaian sesi coaching per unit kerja</CardDescription>
              </div>
              {selectedDept && (
                <button
                  onClick={() => setSelectedDept('')}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Reset Filter Dept
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 p-4">
            <div className="max-h-80 overflow-y-auto overflow-x-hidden rounded-lg border border-border-custom">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-bg-muted text-text-secondary uppercase text-[11px] font-semibold tracking-wider border-b border-border-custom sticky top-0 z-10">
                  <tr>
                    <th className="w-8 px-2 py-2 text-center whitespace-nowrap">No</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">Departemen</th>
                    <th className="w-12 px-1 py-2 text-center whitespace-nowrap">Total</th>
                    <th className="w-14 px-1 py-2 text-center whitespace-nowrap">Approved</th>
                    <th className="w-14 px-1 py-2 text-center whitespace-nowrap">Wait Apv</th>
                    <th className="w-12 px-1 py-2 text-center whitespace-nowrap">Drafted</th>
                    <th className="w-16 px-1 py-2 text-center whitespace-nowrap">NY Submit</th>
                    <th className="w-28 px-2 py-2 text-right whitespace-nowrap">Accomplishment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50 bg-bg-surface">
                  {summary?.per_departemen && summary.per_departemen.length > 0 ? (
                    summary.per_departemen.map((d: any) => (
                      <tr
                        key={d.no}
                        onClick={() => setSelectedDept(d.departemen === selectedDept ? '' : d.departemen)}
                        className={`cursor-pointer transition-colors hover:bg-bg-hover/80 ${selectedDept === d.departemen ? 'bg-primary/10 font-bold' : ''}`}
                      >
                        <td className="px-2 py-2 text-center text-text-muted whitespace-nowrap">{d.no}</td>
                        <td className="px-2 py-2 font-medium text-text-primary truncate max-w-[180px] sm:max-w-[220px]" title={d.departemen}>
                          {d.departemen}
                        </td>
                        <td className="px-1 py-2 text-center whitespace-nowrap font-medium">{d.total}</td>
                        <td className="px-1 py-2 text-center text-emerald-500 font-semibold whitespace-nowrap">{d.approved}</td>
                        <td className="px-1 py-2 text-center text-amber-500 whitespace-nowrap">{d.wait_apv}</td>
                        <td className="px-1 py-2 text-center text-sky-500 whitespace-nowrap">{d.drafted}</td>
                        <td className="px-1 py-2 text-center text-rose-500 whitespace-nowrap">{d.ny_submit}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 bg-bg-muted rounded-full h-1.5 overflow-hidden border border-border-custom flex-shrink-0">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  d.accomplishments_pct >= 90
                                    ? 'bg-emerald-500'
                                    : d.accomplishments_pct >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(Math.max(d.accomplishments_pct, 0), 100)}%` }}
                              />
                            </div>
                            <span className={`text-[11px] font-bold w-10 text-right ${
                              d.accomplishments_pct >= 90
                                ? 'text-emerald-500 dark:text-emerald-400'
                                : d.accomplishments_pct >= 70
                                ? 'text-amber-500 dark:text-amber-400'
                                : 'text-rose-500 dark:text-rose-400'
                            }`}>
                              {d.accomplishments_pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-text-muted text-xs">
                        Tidak ada data departemen
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Detail Table with Superior Columns */}
      <Card className="border-border-custom bg-bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold">Detail Coaching Karyawan & Atasan</CardTitle>
              <CardDescription className="text-xs">
                {selectedDept ? `Menampilkan departemen: ${selectedDept}` : 'Semua karyawan'} ({details.length} data)
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Karyawan / Atasan / NIK..."
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
                <TableHead>NIK</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Atasan (Superior)</TableHead>
                <TableHead className="text-center">Jml Sesi</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Tgl Sesi Terakhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDetails.length > 0 ? (
                paginatedDetails.map((emp, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="font-semibold text-text-primary">{emp.nama}</TableCell>
                    <TableCell className="font-mono text-xs">{emp.nik}</TableCell>
                    <TableCell className="text-text-secondary">{emp.departemen || '-'}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium text-text-primary">{emp.superior_nama || '-'}</span>
                        {emp.superior_nik && (
                          <span className="block text-[11px] text-text-muted font-mono">{emp.superior_nik}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${emp.jumlah_coaching >= 2 ? 'bg-success-bg text-success' : 'bg-bg-muted text-text-secondary'}`}>
                        {emp.jumlah_coaching}x
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(emp.status)}</TableCell>
                    <TableCell className="text-xs text-text-muted">{emp.tanggal_coaching || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-text-muted text-xs">
                    {isLoading ? 'Memuat data...' : 'Tidak ada catatan coaching ditemukan.'}
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
    </div>
  )
}
