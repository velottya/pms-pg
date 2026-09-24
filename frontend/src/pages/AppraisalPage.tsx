import React, { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Award,
  BarChart3,
  Layers,
  X,
  Building2,
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { UploadPanel } from '../components/UploadPanel'
import { SummaryCards, SummaryCardItem } from '../components/SummaryCards'
import { DownloadReportButton } from '../components/DownloadReportButton'
import { usePeriod } from '../context/PeriodContext'
import { api } from '../lib/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

export const AppraisalPage: React.FC = () => {
  const { tahun, triwulan, refreshKey } = usePeriod()

  // Tabs: 'summary' | 'score_analytics'
  const [activeTab, setActiveTab] = useState<'summary' | 'score_analytics'>('summary')

  const [summary, setSummary] = useState<any>(null)
  const [details, setDetails] = useState<any[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<any>(null)
  const [deptAvgScores, setDeptAvgScores] = useState<any[]>([])

  // Search filter for summary department table
  const [deptSearch, setDeptSearch] = useState('')

  // Department Modal Drill-Down state
  const [selectedDeptModal, setSelectedDeptModal] = useState<string | null>(null)
  const [modalDeptDetails, setModalDeptDetails] = useState<any[]>([])
  const [modalSearch, setModalSearch] = useState('')
  const [modalStatusFilter, setModalStatusFilter] = useState('ALL')
  const [modalPage, setModalPage] = useState(1)
  const modalPageSize = 10
  const [isModalLoading, setIsModalLoading] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (selectedDeptModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedDeptModal])

  useEffect(() => {
    fetchData()
  }, [tahun, triwulan, refreshKey])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [sumRes, detRes, distRes, avgRes] = await Promise.all([
        api.get(`/appraisal/summary?tahun=${tahun}&triwulan=${triwulan}`),
        api.get(`/appraisal/detail?tahun=${tahun}&triwulan=${triwulan}`),
        api.get(`/appraisal/score-distribution?tahun=${tahun}&triwulan=${triwulan}`),
        api.get(`/appraisal/average-score-per-departemen?tahun=${tahun}&triwulan=${triwulan}`),
      ])
      setSummary(sumRes.data)
      setDetails(detRes.data)
      setScoreDistribution(distRes.data)
      setDeptAvgScores(avgRes.data)
    } catch (err) {
      console.error('Error fetching appraisal data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Open modal when department row is clicked
  const handleOpenDeptModal = async (deptName: string) => {
    setSelectedDeptModal(deptName)
    setModalSearch('')
    setModalStatusFilter('ALL')
    setModalPage(1)
    setIsModalLoading(true)
    try {
      const res = await api.get(
        `/appraisal/detail?tahun=${tahun}&triwulan=${triwulan}&departemen=${encodeURIComponent(deptName)}`
      )
      setModalDeptDetails(res.data)
    } catch (err) {
      console.error('Error fetching department details:', err)
      // Fallback to in-memory filter from details
      setModalDeptDetails(details.filter((d) => d.departemen === deptName))
    } finally {
      setIsModalLoading(false)
    }
  }

  const handleCloseDeptModal = () => {
    setSelectedDeptModal(null)
    setModalDeptDetails([])
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
      label: 'Approved',
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
      label: 'Declined',
      value: summary?.declined_count ?? 0,
      percentage: summary?.declined_pct ?? 0,
      subtext: 'of Total',
      icon: 'cross',
      variant: 'danger',
    },
    {
      label: 'Not Yet Submitted',
      value: summary?.not_yet_submitted_count ?? 0,
      percentage: summary?.not_yet_submitted_pct ?? 0,
      subtext: 'of Total',
      icon: 'alert',
      variant: 'info',
    },
  ]

  // Overall Doughnut chart calculations
  const approvedCount = summary?.approved_count ?? 0
  const waitApvCount = summary?.waiting_approval_count ?? 0
  const declinedCount = summary?.declined_count ?? 0
  const notYetSubmittedCount = summary?.not_yet_submitted_count ?? 0

  const submittedCount = approvedCount + waitApvCount + declinedCount
  const submittedPct = totalEmployees > 0 ? (submittedCount / totalEmployees) * 100 : 0

  const chartData = {
    labels: ['Approved', 'Waiting Approval', 'Declined', 'Not Yet Submitted'],
    datasets: [
      {
        data: [
          summary?.approved_pct || 0,
          summary?.waiting_approval_pct || 0,
          summary?.declined_pct || 0,
          summary?.not_yet_submitted_pct || 0,
        ],
        backgroundColor: ['#10b981', '#a855f7', '#f59e0b', '#ef4444'],
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
    cutout: '74%',
  }

  // Distribution Chart Data
  const distBarData = {
    labels: ['< 85', '85 - 95', '96 - 100', '> 100'],
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

  // Dept Average Chart Data
  const deptBarData = {
    labels: deptAvgScores.slice(0, 12).map((d) => d.departemen.replace('Departemen ', 'Dep. ')),
    datasets: [
      {
        label: 'Rata-rata Skor',
        data: deptAvgScores.slice(0, 12).map((d) => d.avg_score),
        backgroundColor: '#0284c7',
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

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'approved') return <Badge variant="success">Approved</Badge>
    if (s.includes('wait') || s.includes('proses')) return <Badge variant="warning">Waiting Approval</Badge>
    if (s.includes('decline') || s.includes('reject') || s.includes('tolak')) return <Badge variant="danger">Declined</Badge>
    return <Badge variant="secondary">Not Yet Submitted</Badge>
  }

  // Filter department summary table by deptSearch
  const filteredDepts = useMemo(() => {
    if (!summary?.per_departemen) return []
    if (!deptSearch.trim()) return summary.per_departemen
    const q = deptSearch.toLowerCase()
    return summary.per_departemen.filter((d: any) =>
      d.departemen.toLowerCase().includes(q)
    )
  }, [summary, deptSearch])

  // Department modal calculations
  const modalTotal = modalDeptDetails.length
  const modalApproved = modalDeptDetails.filter((d) => (d.status || '').toLowerCase() === 'approved').length
  const modalWaitApv = modalDeptDetails.filter((d) => {
    const s = (d.status || '').toLowerCase()
    return s.includes('wait') || s.includes('proses')
  }).length
  const modalDeclined = modalDeptDetails.filter((d) => {
    const s = (d.status || '').toLowerCase()
    return s.includes('decline') || s.includes('reject') || s.includes('tolak')
  }).length
  const modalNYSubmit = modalTotal - modalApproved - modalWaitApv - modalDeclined

  const modalSubmittedCount = modalApproved + modalWaitApv + modalDeclined
  const modalSubmittedPct = modalTotal > 0 ? (modalSubmittedCount / modalTotal) * 100 : 0

  const modalChartData = {
    labels: ['Approved', 'Waiting Approval', 'Declined', 'Not Yet Submitted'],
    datasets: [
      {
        data: [
          modalTotal > 0 ? (modalApproved / modalTotal) * 100 : 0,
          modalTotal > 0 ? (modalWaitApv / modalTotal) * 100 : 0,
          modalTotal > 0 ? (modalDeclined / modalTotal) * 100 : 0,
          modalTotal > 0 ? (modalNYSubmit / modalTotal) * 100 : 0,
        ],
        backgroundColor: ['#10b981', '#a855f7', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }

  // Modal filtered employees
  const filteredModalEmployees = useMemo(() => {
    return modalDeptDetails.filter((emp) => {
      const matchSearch =
        !modalSearch.trim() ||
        emp.nama.toLowerCase().includes(modalSearch.toLowerCase()) ||
        emp.nik.toLowerCase().includes(modalSearch.toLowerCase())

      if (!matchSearch) return false

      if (modalStatusFilter === 'ALL') return true
      const s = (emp.status || '').toLowerCase()
      if (modalStatusFilter === 'APPROVED') return s === 'approved'
      if (modalStatusFilter === 'WAITING') return s.includes('wait') || s.includes('proses')
      if (modalStatusFilter === 'DECLINED') return s.includes('decline') || s.includes('reject') || s.includes('tolak')
      if (modalStatusFilter === 'NOT_YET') return !s || s.includes('belum') || s.includes('not')
      return true
    })
  }, [modalDeptDetails, modalSearch, modalStatusFilter])

  const modalTotalPages = Math.ceil(filteredModalEmployees.length / modalPageSize) || 1
  const paginatedModalEmployees = filteredModalEmployees.slice(
    (modalPage - 1) * modalPageSize,
    modalPage * modalPageSize
  )

  return (
    <div className="space-y-6">
      <UploadPanel currentModule="appraisal" moduleLabel="Report Appraisal" />

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Performance Appraisal</h3>
          <p className="text-xs text-text-muted">
            Evaluasi dan distribusi penilaian capaian kinerja (Tahun {tahun} TW {triwulan})
          </p>
        </div>
        <DownloadReportButton modul="appraisal" />
      </div>

      {/* Navigation Tabs (Summary & Score Analytics) - Without Numbering */}
      <div className="flex items-center gap-2 border-b border-border-custom pb-3">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === 'summary'
              ? 'bg-primary text-white shadow-md shadow-primary/25'
              : 'bg-bg-muted/70 text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-custom/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Summary
        </button>

        <button
          onClick={() => setActiveTab('score_analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === 'score_analytics'
              ? 'bg-primary text-white shadow-md shadow-primary/25'
              : 'bg-bg-muted/70 text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-custom/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Score Analytics
        </button>
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <SummaryCards items={summaryCards} />

          {/* Top Section: Overall Appraisal Status & Department Summary Report */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Doughnut Chart with Centered Metric and Symmetrical Legend */}
            <Card className="border-border-custom bg-bg-card flex flex-col justify-between">
              <CardHeader className="p-4 border-b border-border-custom/50">
                <CardTitle className="text-sm font-bold tracking-tight">OVERALL APPRAISAL STATUS</CardTitle>
                <CardDescription className="text-xs">Distribusi status evaluasi penilaian kinerja</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                {totalEmployees > 0 ? (
                  <>
                    <div className="flex-1 flex items-center justify-center py-2">
                      <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                        <Doughnut data={chartData} options={chartOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-black text-text-primary tracking-tight">
                            {submittedPct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
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
                      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                            <span className="text-text-secondary truncate">Approved</span>
                          </div>
                          <div className="font-bold whitespace-nowrap ml-2 text-right">
                            <span className="text-text-primary">{approvedCount}</span>{' '}
                            <span className="text-emerald-500 font-semibold">
                              ({(summary?.approved_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                            <span className="text-text-secondary truncate">WaitApv</span>
                          </div>
                          <div className="font-bold whitespace-nowrap ml-2 text-right">
                            <span className="text-text-primary">{waitApvCount}</span>{' '}
                            <span className="text-purple-400 font-semibold">
                              ({(summary?.waiting_approval_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                            <span className="text-text-secondary truncate">Declined</span>
                          </div>
                          <div className="font-bold whitespace-nowrap ml-2 text-right">
                            <span className="text-text-primary">{declinedCount}</span>{' '}
                            <span className="text-amber-500 font-semibold">
                              ({(summary?.declined_pct || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                            <span className="text-text-secondary truncate">NY Submit</span>
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

            {/* Department Summary Table with Search Header & Click-to-Open Modal */}
            <Card className="border-border-custom bg-bg-card lg:col-span-2">
              <CardHeader className="pb-3 border-b border-border-custom/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight uppercase">
                      Performance Appraisal Summary Report (Departemen)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sorted by fastest completion · Click a row for detail
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      placeholder="Cari departemen..."
                      className="w-full bg-bg-muted text-text-primary text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 p-4">
                <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-lg border border-border-custom">
                  <table className="w-full text-xs text-left border-collapse min-w-[620px] sm:min-w-full">
                    <thead className="bg-bg-muted text-text-secondary uppercase text-[11px] font-semibold tracking-wider border-b border-border-custom sticky top-0 z-10">
                      <tr>
                        <th className="w-8 px-2 py-2 text-center whitespace-nowrap">No</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Departemen</th>
                        <th className="w-12 px-1 py-2 text-center whitespace-nowrap">Total</th>
                        <th className="w-14 px-1 py-2 text-center whitespace-nowrap">Approved</th>
                        <th className="w-14 px-1 py-2 text-center whitespace-nowrap">Wait Apv</th>
                        <th className="w-12 px-1 py-2 text-center whitespace-nowrap">Declined</th>
                        <th className="w-16 px-1 py-2 text-center whitespace-nowrap">NY Submit</th>
                        <th className="w-28 px-2 py-2 text-right whitespace-nowrap">Accomplishments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom/50 bg-bg-surface">
                      {filteredDepts.length > 0 ? (
                        filteredDepts.map((d: any) => (
                          <tr
                            key={d.no}
                            onClick={() => handleOpenDeptModal(d.departemen)}
                            className="cursor-pointer transition-colors hover:bg-primary/10 group"
                            title="Klik untuk melihat detail karyawan departemen ini"
                          >
                            <td className="px-2 py-2 text-center text-text-muted whitespace-nowrap">{d.no}</td>
                            <td className="px-2 py-2 font-semibold text-text-primary group-hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-[220px]" title={d.departemen}>
                              {d.departemen}
                            </td>
                            <td className="px-1 py-2 text-center whitespace-nowrap font-medium">{d.total}</td>
                            <td className="px-1 py-2 text-center text-emerald-500 font-semibold whitespace-nowrap">{d.approved}</td>
                            <td className="px-1 py-2 text-center text-purple-400 whitespace-nowrap">{d.wait_apv}</td>
                            <td className="px-1 py-2 text-center text-amber-500 whitespace-nowrap">{d.drafted}</td>
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
                            {isLoading ? 'Memuat data departemen...' : 'Tidak ada data departemen ditemukan.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: SCORE ANALYTICS */}
      {activeTab === 'score_analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border-custom bg-bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Appraisal Distribution Score
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribusi jumlah karyawan berdasarkan rentang skor ({scoreDistribution?.total_scored || 0} ternilai)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72 p-4">
                <Bar data={distBarData} options={barOptions} />
              </CardContent>
            </Card>

            <Card className="border-border-custom bg-bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-500" />
                  Average Score per Departemen
                </CardTitle>
                <CardDescription className="text-xs">Rata-rata perolehan nilai kinerja per unit kerja</CardDescription>
              </CardHeader>
              <CardContent className="h-72 p-4">
                {deptAvgScores.length > 0 ? (
                  <Bar data={deptBarData} options={barOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted text-xs">
                    Belum ada skor tercatat untuk periode ini.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* DEPARTMENT DETAIL MODAL (Rendered via React Portal directly onto document.body at top z-index) */}
      {selectedDeptModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={handleCloseDeptModal}
          >
            <div
              className="bg-bg-card border border-border-custom rounded-2xl w-full max-w-5xl h-auto max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border-custom flex items-start sm:items-center justify-between bg-bg-surface/90 gap-3 flex-shrink-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      DEPARTMENT DETAIL
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="truncate">{selectedDeptModal}</span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-text-muted">
                    Detail evaluasi capaian kinerja perorangan unit kerja (Tahun {tahun} TW {triwulan})
                  </p>
                </div>

                <button
                  onClick={handleCloseDeptModal}
                  className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors border border-border-custom/60 flex-shrink-0"
                  title="Tutup Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body: No outer scroll on desktop, compact layout */}
              <div className="p-3.5 sm:p-5 overflow-y-auto lg:overflow-hidden flex-1 flex flex-col gap-3 min-h-0">
                {/* 5 Dept Mini KPI Cards */}
                <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <div className="p-2.5 rounded-xl border border-border-custom bg-bg-surface flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-text-muted">TOTAL EMPLOYEES</span>
                    <span className="text-base sm:text-lg font-extrabold text-text-primary mt-0.5">{modalTotal}</span>
                    <span className="text-[9px] text-text-muted mt-0.5 truncate">{selectedDeptModal}</span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-emerald-500">APPROVED</span>
                    <span className="text-base sm:text-lg font-extrabold text-emerald-500 mt-0.5">{modalApproved}</span>
                    <span className="text-[9px] text-emerald-500/80 mt-0.5">
                      {modalTotal > 0 ? ((modalApproved / modalTotal) * 100).toFixed(1) : 0}% of Total
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-purple-400">WAITING APPROVAL</span>
                    <span className="text-base sm:text-lg font-extrabold text-purple-400 mt-0.5">{modalWaitApv}</span>
                    <span className="text-[9px] text-purple-400/80 mt-0.5">
                      {modalTotal > 0 ? ((modalWaitApv / modalTotal) * 100).toFixed(1) : 0}% of Total
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-amber-500">DECLINED</span>
                    <span className="text-base sm:text-lg font-extrabold text-amber-500 mt-0.5">{modalDeclined}</span>
                    <span className="text-[9px] text-amber-500/80 mt-0.5">
                      {modalTotal > 0 ? ((modalDeclined / modalTotal) * 100).toFixed(1) : 0}% of Total
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col col-span-2 sm:col-span-1">
                    <span className="text-[9px] uppercase font-bold text-rose-500">NOT YET SUBMITTED</span>
                    <span className="text-base sm:text-lg font-extrabold text-rose-500 mt-0.5">{modalNYSubmit}</span>
                    <span className="text-[9px] text-rose-500/80 mt-0.5">
                      {modalTotal > 0 ? ((modalNYSubmit / modalTotal) * 100).toFixed(1) : 0}% of Total
                    </span>
                  </div>
                </div>

                {/* Grid: Doughnut Left & Employee Table Right */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Dept Doughnut Chart */}
                  <div className="p-3.5 rounded-xl border border-border-custom bg-bg-surface flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-0.5">
                        OVERALL APPRAISAL STATUS
                      </h4>
                      <p className="text-[10px] text-text-muted">Status evaluasi departemen</p>
                    </div>

                    <div className="flex-1 flex items-center justify-center py-2 min-h-[140px]">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <Doughnut data={modalChartData} options={chartOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xl font-black text-text-primary">
                            {modalSubmittedPct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </span>
                          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                            SUBMITTED
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border-custom space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-text-secondary">Approved</span>
                        </div>
                        <span className="font-bold text-text-primary">{modalApproved}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span className="text-text-secondary">WaitApv</span>
                        </div>
                        <span className="font-bold text-text-primary">{modalWaitApv}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-text-secondary">Declined</span>
                        </div>
                        <span className="font-bold text-text-primary">{modalDeclined}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span className="text-text-secondary">NY Submit</span>
                        </div>
                        <span className="font-bold text-text-primary">{modalNYSubmit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dept Employee Table */}
                  <div className="p-3.5 rounded-xl border border-border-custom bg-bg-surface lg:col-span-2 flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">EMPLOYEES</h4>
                        <span className="text-[11px] text-text-muted">
                          {filteredModalEmployees.length} of {modalTotal}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-44">
                          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={modalSearch}
                            onChange={(e) => {
                              setModalSearch(e.target.value)
                              setModalPage(1)
                            }}
                            placeholder="Cari nama atau NIK..."
                            className="w-full bg-bg-muted text-text-primary text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <select
                          value={modalStatusFilter}
                          onChange={(e) => {
                            setModalStatusFilter(e.target.value)
                            setModalPage(1)
                          }}
                          className="bg-bg-muted text-text-primary text-xs px-2.5 py-1.5 rounded-lg border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="ALL">All Status</option>
                          <option value="APPROVED">Approved</option>
                          <option value="WAITING">Waiting Approval</option>
                          <option value="DECLINED">Declined</option>
                          <option value="NOT_YET">Not Yet Submitted</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto rounded-lg border border-border-custom">
                      <table className="w-full text-xs text-left border-collapse min-w-[480px]">
                        <thead className="bg-bg-muted text-text-secondary uppercase text-[11px] font-semibold tracking-wider border-b border-border-custom sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Nama</th>
                            <th className="px-2 py-2 text-left whitespace-nowrap">NIK</th>
                            <th className="px-2 py-2 text-center whitespace-nowrap">Status</th>
                            <th className="px-2 py-2 text-center whitespace-nowrap">Submit Date</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">Total Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-custom/50 bg-bg-surface">
                          {paginatedModalEmployees.length > 0 ? (
                            paginatedModalEmployees.map((emp, idx) => (
                              <tr key={idx} className="hover:bg-bg-hover/60 transition-colors">
                                <td className="px-3 py-2 font-semibold text-text-primary">{emp.nama}</td>
                                <td className="px-2 py-2 font-mono text-[11px] text-text-secondary">{emp.nik}</td>
                                <td className="px-2 py-2 text-center">{getStatusBadge(emp.status)}</td>
                                <td className="px-2 py-2 text-center text-xs text-text-muted">{emp.submit_date || '-'}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold">
                                  {emp.total_score !== null && emp.total_score !== undefined ? (
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                                        emp.total_score >= 96
                                          ? 'bg-emerald-500/15 text-emerald-500'
                                          : emp.total_score >= 85
                                          ? 'bg-primary/15 text-primary'
                                          : 'bg-rose-500/15 text-rose-500'
                                      }`}
                                    >
                                      {emp.total_score.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-text-muted text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center py-6 text-text-muted text-xs">
                                {isModalLoading ? 'Memuat data...' : 'Tidak ada karyawan yang sesuai filter.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {modalTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-2.5 text-xs flex-shrink-0">
                        <span className="text-text-muted">
                          Halaman {modalPage} dari {modalTotalPages}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={modalPage === 1}
                            onClick={() => setModalPage((p) => Math.max(p - 1, 1))}
                            className="p-1 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover disabled:opacity-40"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={modalPage === modalTotalPages}
                            onClick={() => setModalPage((p) => Math.min(p + 1, modalTotalPages))}
                            className="p-1 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover disabled:opacity-40"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
