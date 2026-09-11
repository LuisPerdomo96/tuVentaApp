import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle } from 'lucide-react'

export default async function SuscripcionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  const { data: pending } = await supabase.rpc('admin_list_pending_approvals')
  const pendingList = (pending as any[]) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Suscripciones</h1>
        <p className="text-gray-600 mt-1">Gestiona los upgrades y planes</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Upgrades Pendientes
            {pendingList.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800">
                {pendingList.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium">No hay upgrades pendientes</p>
              <p className="text-sm">Cuando un cliente elija un plan pago, aparecerá aquí.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingList.map((p: any) => (
                <div key={p.event_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{p.company_name}</p>
                    <p className="text-sm text-gray-500">{p.owner_email}</p>
                  </div>
                  <Badge>{p.plan_to}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}