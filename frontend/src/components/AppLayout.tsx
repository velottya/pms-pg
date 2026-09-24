import React, { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FileText,
  Users2,
  TrendingUp,
  Compass,
  Database,
  History,
  AlertTriangle,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  FileSpreadsheet,
  ShieldAlert,
  UserX,
  BarChart3,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { PeriodFilter } from './PeriodFilter'
import { usePeriod } from '../context/PeriodContext'
import { useAuth } from '../context/AuthContext'

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { tahun, triwulan } = usePeriod()
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isMasterOrAuditPage = [
    '/overview',
    '/konversi-master',
    '/delegasi-coaching',
    '/delegasi',
    '/tidak-coaching',
    '/riwayat-upload',
    '/data-perlu-review',
    '/data-karyawan',
  ].includes(location.pathname)

  const navItems = [
    {
      group: 'Modul Kinerja',
      items: [
        { to: '/planning', label: 'Performance Planning', icon: FileText },
        { to: '/coaching', label: 'Performance Coaching', icon: Users2 },
        { to: '/appraisal', label: 'Performance Appraisal', icon: TrendingUp },
        { to: '/review-360', label: 'Performance Review (360)', icon: Compass },
      ],
    },
    {
      group: 'Master & Audit',
      items: [
        { to: '/overview', label: 'Overview Karyawan', icon: BarChart3 },
        { to: '/konversi-master', label: 'Pengolahan Data Master', icon: Database },
        { to: '/data-perlu-review', label: 'Data Perlu Review', icon: AlertTriangle },
        { to: '/riwayat-upload', label: 'Riwayat Aktivitas', icon: History },
      ],
    },
  ]

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/overview':
        return 'Overview Karyawan & Visualisasi Data'
      case '/planning':
        return 'Performance Planning'
      case '/coaching':
        return 'Performance Coaching Superior'
      case '/appraisal':
        return 'Performance Appraisal'
      case '/review-360':
        return 'Performance Review 360'
      case '/konversi-master':
        return 'Pengolahan & Download Data Master'
      case '/delegasi-coaching':
      case '/delegasi':
      case '/tidak-coaching':
        return 'Monitoring Delegasi & Audit Coaching'
      case '/data-karyawan':
        return 'Master Data Karyawan'
      case '/data-perlu-review':
        return 'Data Perlu Review (Orphan Rows)'
      case '/riwayat-upload':
      case '/riwayat-aktivitas':
        return 'Riwayat Aktivitas & Log Data'
      default:
        return 'Dashboard'
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-bg-surface border-b border-border-custom sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center">
            <img
              src="/logo-pg.png"
              alt="Logo PG"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo-pg.jpg'
              }}
            />
          </div>
          <span className="font-bold text-sm text-text-primary">PMS Petrokimia</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-bg-muted text-text-primary"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-bg-surface border-r border-border-custom flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Transparent Logo Brand without background */}
          <div className="p-4 border-b border-border-custom flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="/logo-pg.png"
                alt="Logo Petrokimia Gresik"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-pg.jpg'
                }}
              />
            </div>
            <div>
              <h1 className="font-extrabold text-xs tracking-tight text-text-primary leading-tight">
                PETROKIMIA GRESIK
              </h1>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">
                Performance System
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-170px)]">
            {navItems.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {group.group}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer with User Info (Operasional SDM), Mode & Logout */}
        <div className="p-3 border-t border-border-custom bg-bg-surface/60 space-y-2.5">
          {/* User Profile Info */}
          <div className="flex items-center gap-2.5 px-1 py-0.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text-primary truncate">
                Operasional SDM
              </p>
            </div>
          </div>

          {/* Theme Mode Toggle & Logout Action */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-custom/50">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-danger hover:bg-danger-bg border border-transparent hover:border-danger/30 transition-all duration-150"
              title="Keluar dari akun"
            >
              <LogOut className="w-4 h-4 text-text-muted group-hover:text-danger" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-bg-surface border-b border-border-custom sticky top-0 z-30">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{getPageTitle()}</h2>
            {!isMasterOrAuditPage && (
              <p className="text-xs text-text-muted">
                Monitoring Kinerja Pegawai • Tahun {tahun} Triwulan {triwulan}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!isMasterOrAuditPage && <PeriodFilter />}
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
