import React, { useState, useRef, useEffect } from 'react'
import {
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Calendar,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from './ui/Button'
import { usePeriod } from '../context/PeriodContext'
import { api } from '../lib/api'

interface DownloadReportButtonProps {
  modul: 'planning' | 'coaching' | 'appraisal' | 'review360'
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({ modul }) => {
  const { tahun, triwulan } = usePeriod()
  const [isOpen, setIsOpen] = useState(false)
  const [downloadingType, setDownloadingType] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const triggerBlobDownload = (blobData: Blob, defaultFilename: string) => {
    const url = window.URL.createObjectURL(blobData)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', defaultFilename)
    document.body.appendChild(link)
    link.click()
    link.parentNode?.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleDownload = async (type: 'pdf' | 'excel', isTahunan: boolean = false) => {
    const key = `${type}_${isTahunan ? 'tahunan' : 'tw'}`
    setDownloadingType(key)
    setStatusMessage(null)
    setIsOpen(false)

    try {
      const endpoint = `/export/${modul}/${type}?tahun=${tahun}${isTahunan ? '&is_tahunan=true' : `&triwulan=${triwulan}`}`
      const response = await api.get(endpoint, {
        responseType: 'blob',
      })

      // Try reading filename from header or create default
      const contentDisposition = response.headers['content-disposition']
      let filename = `Laporan_${modul}_${isTahunan ? `Tahunan_${tahun}` : `TW${triwulan}_${tahun}`}.${type === 'pdf' ? 'pdf' : 'xlsx'}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }

      const mimeType =
        type === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const blob = new Blob([response.data], { type: mimeType })

      triggerBlobDownload(blob, filename)
      setStatusMessage({ text: `Berhasil mengunduh ${filename}`, type: 'success' })
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (err: any) {
      console.error('Download error:', err)
      setStatusMessage({
        text: 'Gagal mengunduh laporan. Pastikan server aktif dan data tersedia.',
        type: 'error',
      })
      setTimeout(() => setStatusMessage(null), 5000)
    } finally {
      setDownloadingType(null)
    }
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="md"
        disabled={downloadingType !== null}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border-border-custom bg-bg-card hover:bg-bg-hover text-text-primary shadow-xs font-semibold"
      >
        {downloadingType ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Download className="w-4 h-4 text-primary" />
        )}
        <span>{downloadingType ? 'Membuat Laporan...' : 'Download Laporan'}</span>
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-text-muted" />
      </Button>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`absolute right-0 top-full mt-2 w-72 p-2.5 rounded-xl border text-xs flex items-center gap-2 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span className="truncate">{statusMessage.text}</span>
        </div>
      )}

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl bg-bg-card border border-border-custom divide-y divide-border-custom/60 z-50 focus:outline-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {/* Triwulan Section */}
          <div className="p-2 space-y-1">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Laporan Periode TW {triwulan} {tahun}
            </p>
            <button
              type="button"
              onClick={() => handleDownload('pdf', false)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-xl transition-all group"
            >
              <div className="p-2 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 shrink-0 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-text-primary group-hover:text-primary transition-colors">
                  Download PDF (TW {triwulan})
                </p>
                <p className="text-[10px] text-text-muted">Header resmi Petrokimia & KPI summary</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('excel', false)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-xl transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-500 shrink-0 transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-text-primary group-hover:text-emerald-500 transition-colors">
                  Download Excel (TW {triwulan})
                </p>
                <p className="text-[10px] text-text-muted">Format lengkap (Summary + Data Detail)</p>
              </div>
            </button>
          </div>

          {/* Tahunan Section */}
          <div className="p-2 space-y-1">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              Laporan Tahunan ({tahun})
            </p>
            <button
              type="button"
              onClick={() => handleDownload('pdf', true)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-xl transition-all group"
            >
              <div className="p-2 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 shrink-0 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-text-primary group-hover:text-primary transition-colors">
                  Download PDF (Tahunan)
                </p>
                <p className="text-[10px] text-text-muted">Akumulasi laporan tahun {tahun}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('excel', true)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-xl transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-500 shrink-0 transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-text-primary group-hover:text-emerald-500 transition-colors">
                  Download Excel (Tahunan)
                </p>
                <p className="text-[10px] text-text-muted">Rekapitulasi lengkap seluruh unit</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
