'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Mail, 
  Calendar,
  Shield,
  ShieldOff,
  Trash2,
  CheckCircle,
  Search,
  AlertTriangle
} from 'lucide-react'
import { adminBlockUser, adminUnblockUser, adminDeleteUser, adminVerifyEmail } from '../actions'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-VE', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function UsuariosContent({ users }: { users: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const filteredUsers = users.filter((user: any) => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleBlock = async (userId: string) => {
    if (!confirm('¿Bloquear este usuario? No podrá acceder a la plataforma.')) return
    setProcessingId(userId)
    const result = await adminBlockUser(userId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else {
      alert('✅ Usuario bloqueado')
      window.location.reload()
    }
  }

  const handleUnblock = async (userId: string) => {
    setProcessingId(userId)
    const result = await adminUnblockUser(userId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else {
      alert('✅ Usuario desbloqueado')
      window.location.reload()
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('⚠️ ¿Eliminar este usuario? Esta acción es irreversible y eliminará todas sus tiendas.')) return
    setProcessingId(userId)
    const result = await adminDeleteUser(userId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else {
      alert('✅ Usuario eliminado')
      window.location.reload()
    }
  }

  const handleVerifyEmail = async (userId: string) => {
    setProcessingId(userId)
    const result = await adminVerifyEmail(userId)
    setProcessingId(null)
    if (result.error) alert('❌ ' + result.error)
    else {
      alert('✅ Email verificado')
      window.location.reload()
    }
  }

  const isBlocked = (user: any) => {
    return user.raw_app_meta_data?.blocked === true
  }

  const isEmailVerified = (user: any) => {
    return user.email_confirmed_at !== null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-600 mt-1">Gestiona los usuarios de la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Emails Verificados</p>
              <p className="text-2xl font-bold">
                {users.filter((u: any) => isEmailVerified(u)).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ShieldOff className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bloqueados</p>
              <p className="text-2xl font-bold">
                {users.filter((u: any) => isBlocked(u)).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Todos los Usuarios
              <Badge className="bg-gray-100 text-gray-700">{filteredUsers.length}</Badge>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user: any) => (
                <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                        {(user.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{user.email}</p>
                          {isEmailVerified(user) ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verificado
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              Pendiente
                            </Badge>
                          )}
                          {isBlocked(user) && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              <ShieldOff className="w-3 h-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          ID: {user.id.slice(0, 8)}... • Registrado: {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEmailVerified(user) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyEmail(user.id)}
                          disabled={processingId === user.id}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verificar
                        </Button>
                      )}
                      {isBlocked(user) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnblock(user.id)}
                          disabled={processingId === user.id}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Desbloquear
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBlock(user.id)}
                          disabled={processingId === user.id}
                          className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        >
                          <ShieldOff className="w-4 h-4 mr-1" />
                          Bloquear
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.id)}
                        disabled={processingId === user.id}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}