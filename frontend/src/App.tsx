import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { PeriodProvider } from './context/PeriodContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'

import { LoginPage } from './pages/LoginPage'
import { PlanningPage } from './pages/PlanningPage'
import { CoachingPage } from './pages/CoachingPage'
import { AppraisalPage } from './pages/AppraisalPage'
import { Review360Page } from './pages/Review360Page'
import { MasterConversionPage } from './pages/MasterConversionPage'
import { OverviewPage } from './pages/OverviewPage'
import { DelegasiCoachingPage } from './pages/DelegasiCoachingPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { UploadHistoryPage } from './pages/UploadHistoryPage'
import { OrphanRowsPage } from './pages/OrphanRowsPage'
import { ThemePreview } from './pages/ThemePreview'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <PeriodProvider>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Application Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Navigate to="/planning" replace />} />
                  <Route path="overview" element={<OverviewPage />} />
                  <Route path="planning" element={<PlanningPage />} />
                  <Route path="coaching" element={<CoachingPage />} />
                  <Route path="appraisal" element={<AppraisalPage />} />
                  <Route path="review-360" element={<Review360Page />} />
                  <Route path="konversi-master" element={<MasterConversionPage />} />
                  <Route path="delegasi-coaching" element={<DelegasiCoachingPage />} />
                  <Route path="delegasi" element={<DelegasiCoachingPage />} />
                  <Route path="tidak-coaching" element={<DelegasiCoachingPage />} />
                  <Route path="data-perlu-review" element={<OrphanRowsPage />} />
                  <Route path="riwayat-upload" element={<UploadHistoryPage />} />
                  <Route path="riwayat-aktivitas" element={<UploadHistoryPage />} />
                  <Route path="theme-preview" element={<ThemePreview />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/planning" replace />} />
            </Routes>
          </PeriodProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
