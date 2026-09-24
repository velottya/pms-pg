import React, { useState, useEffect } from 'react'
import { usePeriod } from '../context/PeriodContext'
import { Calendar, Plus, Check } from 'lucide-react'
import { api } from '../lib/api'

export const PeriodFilter: React.FC = () => {
  const { tahun, triwulan, setTahun, setTriwulan, triggerRefresh } = usePeriod()
  const [availableYears, setAvailableYears] = useState<number[]>([2026])
  const [isAddingYear, setIsAddingYear] = useState(false)
  const [customYear, setCustomYear] = useState<string>('')

  useEffect(() => {
    fetchYears()
  }, [])

  const fetchYears = async () => {
    try {
      const res = await api.get('/periods/years')
      if (res.data && res.data.length > 0) {
        setAvailableYears(res.data)
      }
    } catch (err) {
      console.error('Error fetching years:', err)
    }
  }

  const handleAddYear = async () => {
    const y = parseInt(customYear)
    if (!y || y < 2000 || y > 2100) return

    try {
      await api.post(`/periods/add-year?tahun=${y}`)
      if (!availableYears.includes(y)) {
        const updated = [...availableYears, y].sort((a, b) => a - b)
        setAvailableYears(updated)
      }
      setTahun(y)
      setIsAddingYear(false)
      setCustomYear('')
      triggerRefresh()
    } catch (err) {
      console.error('Error adding year:', err)
    }
  }

  const quarters = [
    { num: 1, label: 'TW I', range: 'Jan - Mar' },
    { num: 2, label: 'TW II', range: 'Apr - Jun' },
    { num: 3, label: 'TW III', range: 'Jul - Sep' },
    { num: 4, label: 'TW IV', range: 'Okt - Des' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2.5 bg-bg-card border border-border-custom px-3.5 py-2 rounded-xl shadow-sm">
      <div className="flex items-center gap-1.5 text-text-secondary text-xs font-bold uppercase tracking-wider">
        <Calendar className="w-3.5 h-3.5 text-primary" />
        <span>Periode:</span>
      </div>

      {/* Dynamic Year Selector */}
      <select
        value={tahun}
        onChange={(e) => setTahun(Number(e.target.value))}
        className="bg-bg-muted text-text-primary text-xs font-bold rounded-lg px-2.5 py-1 border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        {availableYears.map((y) => (
          <option key={y} value={y}>
            Tahun {y}
          </option>
        ))}
      </select>

      {/* Add New Year Toggle */}
      {isAddingYear ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="2020"
            max="2035"
            placeholder="Tahun"
            value={customYear}
            onChange={(e) => setCustomYear(e.target.value)}
            className="w-16 px-2 py-0.5 text-xs bg-bg-muted text-text-primary border border-primary rounded-md focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleAddYear}
            className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary-hover"
            title="Simpan Tahun"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingYear(true)}
          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors"
          title="Tambah Tahun Lain"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Quarters with Month Ranges */}
      <div className="flex items-center gap-1 bg-bg-muted p-0.5 rounded-lg border border-border-custom/50">
        {quarters.map((q) => (
          <button
            key={q.num}
            onClick={() => setTriwulan(q.num)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex flex-col items-center leading-tight ${
              triwulan === q.num
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <span>{q.label}</span>
            <span className="text-[9px] opacity-80 font-normal">({q.range})</span>
          </button>
        ))}
      </div>
    </div>
  )
}
