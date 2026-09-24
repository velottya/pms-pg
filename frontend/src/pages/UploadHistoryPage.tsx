import React, { useEffect, useState } from 'react'
import { History, FileSpreadsheet, CheckCircle2, AlertTriangle, Calendar, User, Trash2 } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { api } from '../lib/api'

export const UploadHistoryPage: React.FC = () => {
  const [uploads, setUploads] = useState<any[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [selectedFilter])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const res = await api.get(`/uploads/history${selectedFilter ? `?jenis=${selectedFilter}` : ''}`)
      setUploads(res.data)
    } catch (err) {
      console.error('Error fetching upload history:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getJenisBadge = (jenis: string, filename?: string) => {
    const isDelete = filename && (filename.includes('[Hapus Data]') || filename.toLowerCase().includes('hapus'))
    if (isDelete) {
      return <Badge variant="danger">Hapus Data</Badge>
    }

    switch (jenis) {
      case 'master':
        return <Badge variant="success">Master Data</Badge>
      case 'kpi_planning':
        return <Badge variant="info">KPI Planning</Badge>
      case 'coaching':
        return <Badge variant="warning">Coaching Superior</Badge>
      case 'appraisal':
        return <Badge variant="default">Appraisal</Badge>
      case 'review360':
        return <Badge variant="secondary">Review 360</Badge>
      default:
        return <Badge variant="outline">{jenis}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // Batasi maksimal 15 baris tanpa menampilkan angka 15
  const displayedUploads = uploads.slice(0, 15)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border-custom/50">
        <div>
          <p className="text-xs text-text-muted">
            Log historis sinkronisasi berkas dan aktivitas pengelolaan data sistem
          </p>
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="bg-bg-card text-text-primary text-xs font-semibold rounded-lg px-3 py-2 border border-border-custom focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Semua Modul</option>
          <option value="master">Master Data</option>
          <option value="kpi_planning">KPI Planning</option>
          <option value="coaching">Coaching Superior</option>
          <option value="appraisal">Appraisal</option>
          <option value="review360">Review 360</option>
        </select>
      </div>

      <Card className="border-border-custom bg-bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Catatan Aktivitas & Sinkronisasi Data
          </CardTitle>
          <CardDescription className="text-xs">
            Daftar aktivitas unggah, sinkronisasi, dan penghapusan data terbaru
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Aktivitas / Modul</TableHead>
                <TableHead>Keterangan / Berkas</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead className="text-center">Status / Baris</TableHead>
                <TableHead className="text-center">Orphan (Gagal Match)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedUploads.length > 0 ? (
                displayedUploads.map((u, idx) => {
                  const isDelete = u.filename && (u.filename.includes('[Hapus Data]') || u.filename.toLowerCase().includes('hapus'))
                  return (
                    <TableRow key={u.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{getJenisBadge(u.jenis_file, u.filename)}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-text-primary flex items-center gap-1.5 truncate max-w-xs">
                          {isDelete ? (
                            <Trash2 className="w-4 h-4 text-danger flex-shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-text-muted flex-shrink-0" />
                          )}
                          <span className={`truncate ${isDelete ? 'text-danger font-medium' : ''}`}>
                            {u.filename}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-text-muted">{formatDate(u.uploaded_at)}</TableCell>
                      <TableCell className="text-xs text-text-secondary">{u.uploaded_by || 'Admin'}</TableCell>
                      <TableCell className="text-center font-bold font-mono">
                        {isDelete ? (
                          <span className="text-danger text-xs font-semibold">Data Dihapus</span>
                        ) : (
                          <span className="text-success">{u.row_count} baris</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {u.orphan_row_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-danger-bg text-danger font-bold">
                            <AlertTriangle className="w-3 h-3" /> {u.orphan_row_count} orphan
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-text-muted text-xs">
                    {isLoading ? 'Memuat riwayat...' : 'Belum ada aktivitas tercatat.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

