import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { ThemeToggle } from '../components/ThemeToggle'
import { CheckCircle2, Clock, AlertCircle, XCircle, Users, BarChart3, TrendingUp, Sparkles } from 'lucide-react'

export const ThemePreview: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-8 transition-colors duration-200">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between pb-6 mb-8 border-b border-border-custom">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md shadow-primary/20">
            PG
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Performance Management System</h1>
            <p className="text-xs text-text-muted">PT Petrokimia Gresik — Design System Preview</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-bg-muted border border-border-custom text-text-secondary">
            Mode Toggle Preview
          </span>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Karyawan</p>
                <h2 className="text-2xl font-bold text-text-primary mt-1">2,418</h2>
                <span className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" /> 100% Terdaftar
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Approved</p>
                <h2 className="text-2xl font-bold text-success mt-1">1,980</h2>
                <span className="text-xs text-text-secondary mt-1">81.9% dari total</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success-bg text-success flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Waiting Approval</p>
                <h2 className="text-2xl font-bold text-warning mt-1">320</h2>
                <span className="text-xs text-text-secondary mt-1">13.2% dari total</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning-bg text-warning flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Not Yet Submit</p>
                <h2 className="text-2xl font-bold text-danger mt-1">118</h2>
                <span className="text-xs text-text-secondary mt-1">4.9% dari total</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-danger-bg text-danger flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badges & Button Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Status Badges & Buttons</CardTitle>
            <CardDescription>Komponen status yang digunakan di semua 4 modul dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="success">Approved</Badge>
              <Badge variant="warning">Waiting Approval</Badge>
              <Badge variant="info">Drafted</Badge>
              <Badge variant="danger">Not Yet Submitted</Badge>
              <Badge variant="danger">Declined</Badge>
              <Badge variant="success">All Done (360)</Badge>
              <Badge variant="warning">Almost Done (360)</Badge>
              <Badge variant="secondary">Kategori: AKTIF</Badge>
              <Badge variant="outline">Kategori: PKWT</Badge>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="default">Tombol Utama (Sync Data)</Button>
              <Button variant="secondary">Filter Periode</Button>
              <Button variant="outline">Download Report</Button>
              <Button variant="danger">Hapus / Reset</Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Table Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Contoh Tabel Ringkasan Departemen</CardTitle>
            <CardDescription>Format tabel adaptif terhadap tema gelap dan terang</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead className="text-center">Wait Apv</TableHead>
                  <TableHead className="text-center">Drafted</TableHead>
                  <TableHead className="text-center">NY Submit</TableHead>
                  <TableHead className="text-right">Accomplishment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">1</TableCell>
                  <TableCell className="font-semibold text-text-primary">Departemen Pemeliharaan Mekanik I</TableCell>
                  <TableCell className="text-center">45</TableCell>
                  <TableCell className="text-center text-success font-medium">42</TableCell>
                  <TableCell className="text-center text-warning font-medium">2</TableCell>
                  <TableCell className="text-center text-info font-medium">1</TableCell>
                  <TableCell className="text-center text-danger font-medium">0</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="w-20 bg-bg-muted rounded-full h-2 overflow-hidden border border-border-custom flex-shrink-0">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: '93.3%' }} />
                      </div>
                      <span className="text-xs font-bold w-12 text-right text-emerald-500">93.3%</span>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">2</TableCell>
                  <TableCell className="font-semibold text-text-primary">Departemen Operasi Pabrik II B</TableCell>
                  <TableCell className="text-center">60</TableCell>
                  <TableCell className="text-center text-success font-medium">55</TableCell>
                  <TableCell className="text-center text-warning font-medium">3</TableCell>
                  <TableCell className="text-center text-info font-medium">0</TableCell>
                  <TableCell className="text-center text-danger font-medium">2</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="w-20 bg-bg-muted rounded-full h-2 overflow-hidden border border-border-custom flex-shrink-0">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: '91.7%' }} />
                      </div>
                      <span className="text-xs font-bold w-12 text-right text-emerald-500">91.7%</span>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">3</TableCell>
                  <TableCell className="font-semibold text-text-primary">Departemen Tanggung Jawab Sosial & Lingkungan</TableCell>
                  <TableCell className="text-center">28</TableCell>
                  <TableCell className="text-center text-success font-medium">20</TableCell>
                  <TableCell className="text-center text-warning font-medium">5</TableCell>
                  <TableCell className="text-center text-info font-medium">2</TableCell>
                  <TableCell className="text-center text-danger font-medium">1</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="w-20 bg-bg-muted rounded-full h-2 overflow-hidden border border-border-custom flex-shrink-0">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: '71.4%' }} />
                      </div>
                      <span className="text-xs font-bold w-12 text-right text-amber-500">71.4%</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
