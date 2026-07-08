'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { 
  QrCode, 
  Download, 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  Loader2,
  Printer,
  Table
} from 'lucide-react'

interface TableQR {
  id: string
  table_number: string
  created_at: string
}

export default function QRPage() {
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<any>(null)
  const [tables, setTables] = useState<TableQR[]>([])
  const [newTableNumber, setNewTableNumber] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const catalogQRRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)

      // Cargar mesas existentes
      const { data: tablesData } = await supabase
        .from('table_qrs')
        .select('*')
        .eq('company_id', companyData.id)
        .order('table_number')

      if (tablesData) setTables(tablesData)
    }
    setLoading(false)
  }

  async function addTable() {
    if (!newTableNumber.trim() || !company) return

    // Verificar que no exista
    if (tables.some(t => t.table_number === newTableNumber.trim())) {
      alert('Ya existe una mesa con ese número')
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('table_qrs')
      .insert({
        company_id: company.id,
        table_number: newTableNumber.trim(),
      })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setNewTableNumber('')
      loadData()
    }
  }

  async function deleteTable(id: string) {
    if (!confirm('¿Eliminar el QR de esta mesa?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('table_qrs')
      .delete()
      .eq('id', id)

    if (!error) loadData()
  }

  function getCatalogUrl() {
    return `${window.location.origin}/${company?.slug}`
  }

  function getTableUrl(tableNumber: string) {
    return `${window.location.origin}/${company?.slug}?mesa=${tableNumber}`
  }

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function downloadQR(elementId: string, fileName: string) {
    const canvas = document.getElementById(elementId) as HTMLCanvasElement
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `${fileName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function printQR(elementId: string, title: string) {
    const canvas = document.getElementById(elementId) as HTMLCanvasElement
    if (!canvas) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${title}</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            margin: 0;
          }
          .qr-container {
            text-align: center;
            padding: 40px;
            border: 2px solid #333;
            border-radius: 16px;
          }
          h1 { margin-bottom: 5px; font-size: 24px; }
          h2 { margin-top: 0; color: #666; font-size: 16px; }
          img { margin: 20px 0; }
          p { color: #888; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <h1>${company?.name || 'Catálogo'}</h1>
          <h2>${title}</h2>
          <img src="${canvas.toDataURL('image/png')}" width="256" height="256" />
          <p>Escanea con tu celular para ver el menú</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  const catalogUrl = company ? getCatalogUrl() : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Códigos QR</h1>
        <p className="text-gray-600">Genera QR para tu catálogo y mesas</p>
      </div>

      {/* QR Principal del Catálogo */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-orange-500" />
            QR del Catálogo Principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* QR */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-lg">
              <QRCodeCanvas
                id="catalog-qr"
                value={catalogUrl}
                size={220}
                level="H"
                includeMargin={true}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>

            {/* Info y acciones */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">URL del catálogo:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm flex-1 truncate">
                    {catalogUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyUrl(catalogUrl, 'catalog')}
                  >
                    {copiedId === 'catalog' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => downloadQR('catalog-qr', `qr-catalogo-${company?.slug}`)}
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <Download className="w-4 h-4" />
                  Descargar PNG
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printQR('catalog-qr', 'Catálogo Principal')}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  💡 <strong>Tip:</strong> Imprime este QR y colócalo en la entrada de tu negocio, 
                  en volantes o compártelo por redes sociales.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR por Mesas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Table className="w-5 h-5" />
              QR por Mesas ({tables.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agregar mesa */}
          <div className="flex gap-3">
            <Input
              placeholder="Número de mesa (Ej: 1, 2, 3...)"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTable()}
              className="max-w-xs"
            />
            <Button onClick={addTable} className="gap-2 bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4" />
              Agregar Mesa
            </Button>
          </div>

          {/* Grid de QRs de mesas */}
          {tables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Table className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay mesas configuradas</p>
              <p className="text-sm">Agrega mesas para generar QR individuales</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tables.map(table => {
                const tableUrl = getTableUrl(table.table_number)
                const qrId = `table-qr-${table.id}`

                return (
                  <Card key={table.id} className="text-center">
                    <CardContent className="p-4">
                      {/* Número de mesa */}
                      <div className="mb-3">
                        <Badge className="bg-gray-900 text-white text-lg px-4 py-1">
                          Mesa {table.table_number}
                        </Badge>
                      </div>

                      {/* QR */}
                      <div className="bg-white p-3 rounded-lg border inline-block mb-3">
                        <QRCodeCanvas
                          id={qrId}
                          value={tableUrl}
                          size={160}
                          level="H"
                          includeMargin={true}
                        />
                      </div>

                      {/* URL */}
                      <p className="text-xs text-gray-500 truncate mb-3">{tableUrl}</p>

                      {/* Acciones */}
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQR(qrId, `qr-mesa-${table.table_number}`)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printQR(qrId, `Mesa ${table.table_number}`)}
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          Imprimir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTable(table.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}