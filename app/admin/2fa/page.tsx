import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TwoFAContent from './2fa-content'
import { adminGet2FAStatus } from '../actions' // <-- Importación corregida

export default async function TwoFAPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_super_admin')
  if (!isAdmin) redirect('/dashboard')

  const result = await adminGet2FAStatus()
  const status = result.data || { is_enabled: false, remaining_backup_codes: 0 }

  return (
    <TwoFAContent
      status={status}
      adminEmail={user.email || ''}
    />
  )
}