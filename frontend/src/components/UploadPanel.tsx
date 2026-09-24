import React, { useState, useRef, useEffect } from 'react'
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert, Sparkles, FileCheck2, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { usePeriod } from '../context/PeriodContext'
import { api } from '../lib/api'

interface UploadPanelProps {
  currentModule: 'kpi_planning' | 'coaching' | 'appraisal' | 'review360'
  moduleLabel: string
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  currentModule,
  moduleLabel
}) => {
  const { tahun, triwulan, triggerRefresh } = usePeriod()

  const [masterMode, setMasterMode] = useState<'active' | 'upload'>('upload')
  const [activeMasterInfo, setActiveMasterInfo] = useState<any>(null)
  const [masterFile, setMasterFile] = useState<File | null>(null)
  const [reportFile, setReportFile] = useState<File | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: any } | null>(null)

  const masterInputRef = useRef<HTMLInputElement>(null)
  const reportInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchLastStatus()
  }, [tahun, triwulan, currentModule])

  const fetchLastStatus = async () => {
    try {
      const res = await api.get(`/uploads/last-status?jenis=${currentModule}&tahun=${tahun}&triwulan=${triwulan}`)
      if (res.data && res.data.master && (res.data.master.total_rows > 0 || res.data.master.aktif_count > 0)) {
        setActiveMasterInfo(res.data.master)
      } else {
        setActiveMasterInfo(null)
      }
    } catch (err) {
      console.error('Error fetching last upload status:', err)
      setActiveMasterInfo(null)
    }
  }

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMasterFile(e.target.files[0])
    }
  }

  const handleReportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReportFile(e.target.files[0])
    }
  }

  const getModuleEndpoint = () => {
    switch (currentModule) {
      case 'kpi_planning':
        return '/planning/data'
      case 'coaching':
        return '/coaching/data'
      case 'appraisal':
        return '/appraisal/data'
      case 'review360':
        return '/review360/data'
      default:
        return ''
    }
  }

  const handleDeletePeriodData = async () => {
    const endpoint = getModuleEndpoint()
    if (!endpoint) return

    setIsDeleting(true)
    try {
      const res = await api.delete(`${endpoint}?tahun=${tahun}&triwulan=${triwulan}`)
      setFeedback({
        type: 'success',
        message: res.data?.message || `Data ${moduleLabel} TW ${triwulan} ${tahun} berhasil dihapus.`,
      })
      setShowDeleteModal(false)
      triggerRefresh()
    } catch (err: any) {
      let errMsg = 'Terjadi kesalahan saat menghapus data.'
      if (err.response?.data?.detail) {
        errMsg = err.response.data.detail
      } else if (err.message) {
        errMsg = err.message
      }
      setFeedback({
        type: 'error',
        message: `Gagal menghapus data: ${errMsg}`,
      })
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSync = async () => {
    if (masterMode === 'upload' && !masterFile && !reportFile) {
      setFeedback({
        type: 'error',
        message: 'Pilih minimal satu file untuk diunggah dan disinkronkan.'
      })
      return
    }

    if (masterMode === 'active') {
      if (!activeMasterInfo || (activeMasterInfo.aktif_count || activeMasterInfo.total_rows || 0) === 0) {
        setFeedback({
          type: 'error',
          message: 'Belum ada Master Data yang diunggah di menu Pengolahan Data Master. Silakan gunakan mode "Upload Master Baru" atau unggah data master terlebih dahulu.'
        })
        return
      }
      if (!reportFile) {
        setFeedback({
          type: 'error',
          message: `Pilih File ${moduleLabel} untuk disinkronkan dengan Master Data aktif yang ada di sistem.`
        })
        return
      }
    }

    setIsLoading(true)
    setFeedback(null)

    try {
      let reportResult = null

      const formData = new FormData()
      if (reportFile) {
        formData.append('file', reportFile)
      }
      if (masterMode === 'upload' && masterFile) {
        formData.append('master_file', masterFile)
      }
      formData.append('jenis', currentModule)
      formData.append('tahun', tahun.toString())
      formData.append('triwulan', triwulan.toString())

      const res = await api.post('/uploads/report', formData)
      reportResult = res.data

      setFeedback({
        type: 'success',
        message: 'Sinkronisasi data berhasil diselesaikan!',
        details: { reportResult }
      })

      // Reset file input
      setMasterFile(null)
      setReportFile(null)
      if (masterInputRef.current) masterInputRef.current.value = ''
      if (reportInputRef.current) reportInputRef.current.value = ''

      // Trigger app-wide reactive refetch
      triggerRefresh()
    } catch (err: any) {
      let errMsg = 'Terjadi kesalahan saat memproses data.'
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
      setFeedback({
        type: 'error',
        message: `Gagal sinkronisasi: ${errMsg}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-bg-card border border-border-custom rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-danger/10 text-danger flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-text-primary">Konfirmasi Hapus Data</h4>
                <p className="text-xs text-text-muted">Tindakan ini akan menghapus data periode terpilih</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-muted/50 border border-border-custom space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Modul:</span>
                <span className="font-semibold text-text-primary">{moduleLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Periode:</span>
                <span className="font-semibold text-text-primary">Tahun {tahun} - Triwulan {triwulan}</span>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Apakah Anda yakin ingin menghapus data untuk periode ini? Aktivitas penghapusan akan dicatat ke dalam{' '}
              <strong className="text-text-primary">Riwayat Aktivitas</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeletePeriodData}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Ya, Hapus Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="border-border-custom bg-bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UploadIcon className="w-5 h-5 text-primary" />
                Upload & Sinkronisasi Data
              </CardTitle>
              <CardDescription className="text-xs">
                Upload Master Data mentah (1 tab tanpa filter manual) & File {moduleLabel} pembanding triwulanan
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Badge variant="secondary" className="text-xs font-semibold">
                Target Sinkron: {tahun} - TW {triwulan}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-danger border-danger/30 hover:bg-danger/10 hover:border-danger text-xs font-semibold gap-1.5 h-8"
                title={`Hapus data ${moduleLabel} untuk Tahun ${tahun} TW ${triwulan}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Data TW {triwulan}
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Slot 1: Master File */}
          <div className="border border-dashed border-border-custom hover:border-primary/50 transition-colors p-4 rounded-xl bg-bg-muted/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  1. Master Data Karyawan
                </span>
                {masterFile && (
                  <button onClick={() => setMasterFile(null)} className="text-text-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Toggle: Gunakan Master Aktif vs Upload Baru */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-bg-muted rounded-lg border border-border-custom mb-2.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMasterMode('upload')}
                  className={`py-1 px-2 rounded-md font-semibold transition-colors text-center ${
                    masterMode === 'upload'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Upload Master Baru
                </button>
                <button
                  type="button"
                  onClick={() => setMasterMode('active')}
                  className={`py-1 px-2 rounded-md font-semibold transition-colors text-center flex items-center justify-center gap-1.5 ${
                    masterMode === 'active'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>Master Aktif Terakhir</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-colors ${
                      masterMode === 'active'
                        ? 'bg-black/30 text-white border border-white/50 shadow-xs'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    BETA
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
                {masterMode === 'upload'
                  ? 'Upload file master data (.xlsx) terbaru untuk disinkronkan dengan laporan.'
                  : 'Status Beta: Master aktif terakhir masih belum bisa dijadikan acuan utama.'}
              </p>
            </div>

            <div>
              {masterMode === 'upload' ? (
                <>
                  <input
                    ref={masterInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleMasterChange}
                    className="hidden"
                    id="master-file-input"
                  />
                  <label
                    htmlFor="master-file-input"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover text-xs font-semibold text-text-primary cursor-pointer transition-colors text-center truncate"
                  >
                    {masterFile ? masterFile.name : 'Pilih File Master Baru (.xlsx)'}
                  </label>
                </>
              ) : (
                <div className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
                  activeMasterInfo
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-border-custom bg-bg-muted text-text-muted'
                }`}>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {activeMasterInfo ? 'Data Master Terakhir (Beta)' : 'Belum Ada Master Tersimpan'}
                  </span>
                  {activeMasterInfo ? (
                    <span className="font-bold text-[11px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-700 dark:text-amber-300">
                      {(activeMasterInfo.aktif_count || activeMasterInfo.total_rows || 0).toLocaleString('id-ID')} Data
                    </span>
                  ) : (
                    <span className="font-medium text-[11px] bg-bg-surface px-2 py-0.5 rounded border border-border-custom text-text-muted">
                      0 Data (Belum Upload di Pengolahan Master)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Slot 2: Report File (Strictly tailored to this module, no dropdown!) */}
          <div className="border border-dashed border-border-custom hover:border-primary/50 transition-colors p-4 rounded-xl bg-bg-muted/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-sky-500" />
                  2. {moduleLabel}
                </span>
                {reportFile && (
                  <button onClick={() => setReportFile(null)} className="text-text-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
                File pembanding triwulan {triwulan} {tahun} untuk modul {moduleLabel}. Dicocokkan by NIK.
              </p>
            </div>
            <div>
              <input
                ref={reportInputRef}
                type="file"
                accept=".xlsx,.xls,.html,.htm"
                onChange={handleReportChange}
                className="hidden"
                id="report-file-input"
              />
              <label
                htmlFor="report-file-input"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-border-custom bg-bg-surface hover:bg-bg-hover text-xs font-semibold text-text-primary cursor-pointer transition-colors text-center truncate"
              >
                {reportFile ? reportFile.name : `Pilih File ${moduleLabel} (.xlsx / .html)`}
              </label>
            </div>
          </div>
        </div>

        {/* Sync Button & Feedback */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-text-muted">
            {masterFile || reportFile ? (
              <span className="text-primary font-medium">Siap untuk memproses</span>
            ) : (
              <span>Pilih file Excel yang akan disinkronkan</span>
            )}
          </div>
          <Button
            onClick={handleSync}
            disabled={isLoading || (!masterFile && !reportFile)}
            variant="default"
            className="w-full sm:w-auto px-6"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Memproses Pipeline...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Data
              </>
            )}
          </Button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start justify-between gap-2.5 border ${
              feedback.type === 'success'
                ? 'bg-success-bg text-success border-success/30'
                : 'bg-danger-bg text-danger border-danger/30'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{feedback.message}</p>
                {feedback.details?.masterResult && (
                  <p className="text-[11px] opacity-90">
                    • Master Data: {feedback.details.masterResult.total_rows} baris ({feedback.details.masterResult.aktif_count} Aktif, {feedback.details.masterResult.pkwt_count} PKWT, {feedback.details.masterResult.purna_count} Purna).
                  </p>
                )}
                {feedback.details?.reportResult && (
                  <p className="text-[11px] opacity-90">
                    • Report: {feedback.details.reportResult.row_count} baris diproses, {feedback.details.reportResult.orphan_row_count} NIK tidak ditemukan di Master (masuk log review).
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-current transition-colors"
              title="Tutup Notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  </>
  )
}
