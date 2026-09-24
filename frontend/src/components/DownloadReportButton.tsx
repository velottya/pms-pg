import React, { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown, Calendar, Layers } from 'lucide-react'
import { Button } from './ui/Button'
import { usePeriod } from '../context/PeriodContext'

interface DownloadReportButtonProps {
  modul: 'planning' | 'coaching' | 'appraisal' | 'review360'
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({ modul }) => {
  const { tahun, triwulan } = usePeriod()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDownload = (type: 'pdf' | 'excel', isTahunan: boolean = false) => {
    setIsOpen(false)
    const url = `${apiBaseUrl}/export/${modul}/${type}?tahun=${tahun}${isTahunan ? '&is_tahunan=true' : `&triwulan=${triwulan}`}`
    window.open(url, '_blank')
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border-border-custom bg-bg-card hover:bg-bg-hover text-text-primary shadow-sm"
      >
        <Download className="w-4 h-4 text-primary" />
        <span>Download Laporan</span>
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-text-muted" />
      </Button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-bg-card border border-border-custom divide-y divide-border-custom/60 z-50 focus:outline-none">
          {/* Triwulan Section */}
          <div className="p-1.5 space-y-0.5">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-primary" />
              Laporan Periode TW {triwulan} {tahun}
            </p>
            <button
              onClick={() => handleDownload('pdf', false)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div>
                <p className="font-semibold">Download PDF (TW {triwulan})</p>
                <p className="text-[10px] text-text-muted">Header logo resmi & ringkasan</p>
              </div>
            </button>
            <button
              onClick={() => handleDownload('excel', false)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold">Download Excel (TW {triwulan})</p>
                <p className="text-[10px] text-text-muted">Sheet Summary + Detail</p>
              </div>
            </button>
          </div>

          {/* Tahunan Section */}
          <div className="p-1.5 space-y-0.5">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-accent" />
              Laporan Tahunan (Setahun {tahun})
            </p>
            <button
              onClick={() => handleDownload('pdf', true)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div>
                <p className="font-semibold">Download PDF (Tahunan)</p>
                <p className="text-[10px] text-text-muted">Akumulasi laporan tahun {tahun}</p>
              </div>
            </button>
            <button
              onClick={() => handleDownload('excel', true)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold">Download Excel (Tahunan)</p>
                <p className="text-[10px] text-text-muted">Rekapitulasi lengkap tahun {tahun}</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
