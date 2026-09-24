import React from 'react'
import { Card, CardContent } from './ui/Card'
import { Users, CheckCircle2, Clock, XCircle, AlertCircle, Award } from 'lucide-react'

export interface SummaryCardItem {
  label: string
  value: string | number
  subtext?: string
  percentage?: string | number
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  icon?: 'users' | 'check' | 'clock' | 'cross' | 'alert' | 'award'
}

interface SummaryCardsProps {
  items: SummaryCardItem[]
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ items }) => {
  const getIcon = (type?: string, variant?: string) => {
    switch (type) {
      case 'check':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
      case 'clock':
        return <Clock className="w-6 h-6 text-amber-500 flex-shrink-0" />
      case 'cross':
        return <XCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
      case 'alert':
        return <AlertCircle className="w-6 h-6 text-sky-500 flex-shrink-0" />
      case 'award':
        return <Award className="w-6 h-6 text-primary flex-shrink-0" />
      case 'users':
      default:
        return <Users className="w-6 h-6 text-primary flex-shrink-0" />
    }
  }

  const getPercentColor = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'text-emerald-500 dark:text-emerald-400'
      case 'warning':
        return 'text-amber-500 dark:text-amber-400'
      case 'danger':
        return 'text-rose-500 dark:text-rose-400'
      case 'info':
        return 'text-sky-500 dark:text-sky-400'
      case 'purple':
        return 'text-purple-500 dark:text-purple-400'
      default:
        return 'text-primary'
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-stretch w-full">
      {items.map((item, idx) => (
        <Card
          key={idx}
          className="border-border-custom bg-bg-card shadow-sm hover:border-primary/40 transition-colors flex flex-col justify-between"
        >
          <CardContent className="p-4 flex items-center justify-between gap-3 h-full">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider truncate">
                {item.label}
              </p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-text-primary">
                {typeof item.value === 'number' ? item.value.toLocaleString('id-ID') : item.value}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate">
                {item.percentage !== undefined ? (
                  <>
                    <span className={`font-bold ${getPercentColor(item.variant)}`}>
                      {typeof item.percentage === 'number'
                        ? item.percentage.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                        : item.percentage}%
                    </span>
                    <span>{item.subtext || 'of Total'}</span>
                  </>
                ) : (
                  <span>{item.subtext}</span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center p-1">
              {getIcon(item.icon, item.variant)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
