import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

interface PeriodContextType {
  tahun: number
  triwulan: number
  setTahun: (tahun: number) => void
  setTriwulan: (triwulan: number) => void
  refreshKey: number
  triggerRefresh: () => void
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined)

export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  // 1-3 -> TW 1, 4-6 -> TW 2, 7-9 -> TW 3, 10-12 -> TW 4
  const currentQuarter = Math.ceil(currentMonth / 3)

  const initialTahun = searchParams.get('tahun') ? parseInt(searchParams.get('tahun')!) : currentYear
  const initialTriwulan = searchParams.get('triwulan') ? parseInt(searchParams.get('triwulan')!) : currentQuarter

  const [tahun, setTahunState] = useState<number>(initialTahun)
  const [triwulan, setTriwulanState] = useState<number>(initialTriwulan)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  const setTahun = (newTahun: number) => {
    setTahunState(newTahun)
    setSearchParams({ tahun: newTahun.toString(), triwulan: triwulan.toString() })
  }

  const setTriwulan = (newTriwulan: number) => {
    setTriwulanState(newTriwulan)
    setSearchParams({ tahun: tahun.toString(), triwulan: newTriwulan.toString() })
  }

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <PeriodContext.Provider
      value={{
        tahun,
        triwulan,
        setTahun,
        setTriwulan,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </PeriodContext.Provider>
  )
}

export const usePeriod = (): PeriodContextType => {
  const context = useContext(PeriodContext)
  if (!context) {
    throw new Error('usePeriod must be used within a PeriodProvider')
  }
  return context
}
