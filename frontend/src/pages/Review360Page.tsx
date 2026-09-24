import React, { useEffect, useState } from 'react'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js'
import { Search, ChevronLeft, ChevronRight, Compass } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { UploadPanel } from '../components/UploadPanel'
import { SummaryCards, SummaryCardItem } from '../components/SummaryCards'
import { DownloadReportButton } from '../components/DownloadReportButton'
import { usePeriod } from '../context/PeriodContext'
import { api } from '../lib/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

export const Review360Page: React.FC = () => {
  const { tahun, triwulan, refreshKey } = usePeriod()

  const [summary, setSummary] = useState<any>(null)
  const [details, setDetails] = useState<any[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<any>(null)
  const [deptAvgScores, setDeptAvgScores] = useState<any[]>([])

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
      const [sumRes, detRes, distRes, avgRes] = await Promise.all([
        api.get(`/review360/summary?tahun=${tahun}&triwulan=${triwulan}`),
        api.get(`/review360/detail?tahun=${tahun}&triwulan=${triwulan}${selectedDept ? `&departemen=${encodeURIComponent(selectedDept)}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
        api.get(`/review360/score-distribution?tahun=${tahun}&triwulan=${triwulan}`),
        api.get(`/review360/average-score-per-departemen?tahun=${tahun}&triwulan=${triwulan}`),
      ])
      setSummary(sumRes.data)
      setDetails(detRes.data)
      setScoreDistribution(distRes.data)
      setDeptAvgScores(avgRes.data)
      setCurrentPage(1)
    } catch (err) {
      console.error('Error fetching review 360 data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const totalEmployees = summary?.total_employees || 0
  const deptCount = summary?.total_departments || summary?.per_departemen?.length || 0

  const summaryCards: SummaryCardItem[] = [
    {
      label: 'Total Karyawan',
      value: totalEmployees,
      subtext: `${deptCount} Departments`,
      icon: 'users',
      variant: 'default',
    },
    {
      label: 'All Done (100%)',
      value: summary?.all_done_count ?? 0,
      percentage: summary?.all_done_pct ?? 0,
      subtext: 'of Total',
      icon: 'check',
      variant: 'success',
    },
    {
      label: 'Almost Done (>=75%)',
      value: summary?.almost_done_count ?? 0,
      percentage: summary?.almost_done_pct ?? 0,
      subtext: 'of Total',
      icon: 'clock',
      variant: 'warning',
    },
    {
      label: 'NY Done (<75%)',
      value: summary?.ny_done_count ?? 0,
      percentage: summary?.ny_done_pct ?? 0,
      subtext: 'of Total',
      icon: 'alert',
      variant: 'info',
    },
    {
      label: 'NY Submitted (0%)',
      value: summary?.not_yet_submitted_count ?? 0,
      percentage: summary?.not_yet_submitted_pct ?? 0,
      subtext: 'of Total',
      icon: 'cross',
      variant: 'danger',
    },
  ]

  const allDoneCount = summary?.all_done_count ?? 0
  const almostDoneCount = summary?.almost_done_count ?? 0
  const nyDoneCount = summary?.ny_done_count ?? 0
  const notYetSubmittedCount = summary?.not_yet_submitted_count ?? 0

  const submittedCount = allDoneCount + almostDoneCount + nyDoneCount
  const submittedPct = totalEmployees > 0 ? (submittedCount / totalEmployees) * 100 : 0

  const chartData = {
    labels: ['All Done', 'Almost Done', 'NY Done', 'NY Submitted'],
    datasets: [
      {
        data: [
          summary?.all_done_pct || 0,
          summary?.almost_done_pct || 0,
          summary?.ny_done_pct || 0,
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

  const distBarData = {
    labels: ['< 85%', '85% - 95%', '96% - 100%', '100%'],
    datasets: [
      {
        label: 'Jumlah Karyawan',
        data: [
          scoreDistribution?.counts?.under_85 || 0,
          scoreDistribution?.counts?.['85_to_95'] || 0,
          scoreDistribution?.counts?.['96_to_100'] || 0,
          scoreDistribution?.counts?.above_100 || 0,
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        borderRadius: 6,
      },
    ],
  }

  const topDepts = deptAvgScores.slice(0, 8)
  const deptBarData = {
    labels: topDepts.map((d) => d.departemen.replace('Departemen ', 'Dep. ')),
    datasets: [
      {
        label: 'Rata-rata % Penilaian',
        data: topDepts.map((d) => d.avg_pct),
        backgroundColor: '#14b8a6',
        borderRadius: 6,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
    },
  }

  const totalPages = Math.ceil(details.length / pageSize) || 1
  const paginatedDetails = details.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getStatusBadge = (status: string) => {
    if (status === 'All Done') return <Badge variant="success">All Done</Badge>
    if (status === 'Almost Done') return <Badge variant="warning">Almost Done</Badge>
    if (status === 'NY Done') return <Badge variant="info">NY Done</Badge>
    return <Badge variant="danger">NY Submitted</Badge>
  }

  return (
    <div className="space-y-6">
      <UploadPanel currentModule="review360" moduleLabel="Report Penilai 360" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Performance Review (360)</h3>
          <p className="text-xs text-text-muted">
            Monitoring umpan balik multi-rater (Atasan, Rekan, Bawahan, Pribadi) (Tahun {tahun} TW {triwulan})
          </p>
        </div>
        <DownloadReportButton modul="review360" />
      </div>

      <SummaryCards items={summaryCards} />

      {/* Top Section: Overall Status Doughnut & Department Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border-custom bg-bg-card flex flex-col justify-between">
          <CardHeader className="p-4 border-b border-border-custom/50">
            <CardTitle className="text-sm font-bold">Overall 360 Review Status</CardTitle>
            <CardDescription className="text-xs">Distribusi pemenuhan penilai multi-rater</CardDescription>
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
                        ACTIVE RATED
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
                        <span className="text-text-secondary truncate">All Done</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{allDoneCount}</span>{' '}
                        <span className="text-emerald-500 font-semibold">
                          ({(summary?.all_done_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                        <span className="text-text-secondary truncate">Almost</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{almostDoneCount}</span>{' '}
                        <span className="text-amber-500 font-semibold">
                          ({(summary?.almost_done_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 flex-shrink-0"></span>
                        <span className="text-text-secondary truncate">NY Done</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{nyDoneCount}</span>{' '}
                        <span className="text-sky-500 font-semibold">
                          ({(summary?.ny_done_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                        <span className="text-text-secondary truncate">NY Sub</span>
                      </div>
                      <div className="font-bold whitespace-nowrap ml-2 text-right">
                        <span className="text-text-primary">{notYetSubmittedCount}</span>{' '}
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
                Belum ada data untuk periode ini.<br />Silakan upload file report.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Summary Table */}
        <Card className="border-border-custom bg-bg-card lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border-custom/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Ringkasan per Departemen</CardTitle>
                <CardDescription className="text-xs">Progress penilaian multi-rater per unit kerja</CardDescription>
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
                    <th className="w-14 px-1 py-2 text-center whitespace-nowrap">All Done</th>
                    <th className="w-14 px-1 py-2 text-center whitespace-nowrap">Almost</th>
                    <th className="w-12 px-1 py-2 text-center whitespace-nowrap">NY Done</th>
                    <th className="w-16 px-1 py-2 text-center whitespace-nowrap">NY Sub</th>
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

      {/* Middle Section: Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border-custom bg-bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Compass className="w-4 h-4 text-accent" />
              Review 360 Completion Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi persentase penilaian rater ({scoreDistribution?.total_assessed || 0} karyawan)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 p-4">
            <Bar data={distBarData} options={barOptions} />
          </CardContent>
        </Card>

        <Card className="border-border-custom bg-bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Average Completion per Departemen</CardTitle>
            <CardDescription className="text-xs">Rata-rata persentase pemenuhan evaluasi per unit</CardDescription>
          </CardHeader>
          <CardContent className="h-64 p-4">
            {deptAvgScores.length > 0 ? (
              <Bar data={deptBarData} options={barOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-xs">
                Belum ada data evaluasi 360 tercatat untuk periode ini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Employee Detail Table */}
      <Card className="border-border-custom bg-bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold">Detail Review 360 Karyawan</CardTitle>
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
                <TableHead>NIK</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead className="text-center">Assessed (Rater)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Persentase (%)</TableHead>
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
                    <TableCell className="text-center font-mono text-xs font-semibold text-text-primary">
                      {emp.assessed || '-'}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(emp.status)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs ${
                          emp.percentage >= 100
                            ? 'bg-success-bg text-success'
                            : emp.percentage >= 75
                            ? 'bg-warning-bg text-warning'
                            : 'bg-danger-bg text-danger'
                        }`}
                      >
                        {emp.percentage}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-text-muted text-xs">
                    {isLoading ? 'Memuat data...' : 'Tidak ada catatan review 360 ditemukan.'}
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
