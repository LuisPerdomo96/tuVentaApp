'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QrCode } from 'lucide-react'
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen, 
  ShoppingCart, 
  Bike, 
  Settings, 
  TrendingUp, 
  Users, 
  Boxes,
  LogOut,
  Crown,
  Menu,
  X
} from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)

  useEffect(() => {
    loadCompany()
  }, [])

  async function loadCompany() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
    }
    setLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Suscribirse a pedidos en tiempo real
  useEffect(() => {
    if (!company) return

    const supabase = createClient()

    console.log('📡 Conectando a tiempo real para empresa:', company.id)

    // Suscribirse a cambios en la tabla orders
    const channel = supabase
      .channel(`orders-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          console.log('🔔 Nuevo pedido recibido:', payload)
          
          // Incrementar contador
          setPendingOrdersCount((prev: number) => prev + 1)
          
          // Reproducir sonido
          playNotificationSound()
          
          // Mostrar notificación
          showBrowserNotification('🛒 ¡Nuevo Pedido!', `Pedido #${(payload.new as any).id.slice(0, 8).toUpperCase()}`)
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status)
      })

    // Cargar contador inicial
    loadPendingOrdersCount()

    return () => {
      console.log('📡 Desconectando de tiempo real')
      supabase.removeChannel(channel)
    }
  }, [company])

  // ✅ useEffect SEPARADO para actualizar el badge (NO anidado)
  useEffect(() => {
    if (!company) return

    const supabase = createClient()

    const channel = supabase
      .channel(`orders-badge-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          console.log('🔄 Actualizando contador de pedidos...')
          loadPendingOrdersCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [company])

  async function loadPendingOrdersCount() {
    if (!company) return
    const supabase = createClient()
    
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .in('status', ['pending_payment', 'payment_review'])

    setPendingOrdersCount(count || 0)
  }

  // 🔊 Función de sonido mejorada
  async function playNotificationSound() {
    try {
      console.log('🔊 Iniciando reproducción de sonido...')
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) {
        console.error('❌ AudioContext no soportado en este navegador')
        return
      }
      
      const audioContext = new AudioContext()
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      // Primer beep
      const oscillator1 = audioContext.createOscillator()
      const gainNode1 = audioContext.createGain()
      
      oscillator1.connect(gainNode1)
      gainNode1.connect(audioContext.destination)
      
      oscillator1.frequency.value = 800
      oscillator1.type = 'sine'
      
      gainNode1.gain.setValueAtTime(0.5, audioContext.currentTime)
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator1.start(audioContext.currentTime)
      oscillator1.stop(audioContext.currentTime + 0.3)
      
      // Segundo beep
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator()
        const gainNode2 = audioContext.createGain()
        
        oscillator2.connect(gainNode2)
        gainNode2.connect(audioContext.destination)
        
        oscillator2.frequency.value = 1000
        oscillator2.type = 'sine'
        
        gainNode2.gain.setValueAtTime(0.5, audioContext.currentTime)
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator2.start(audioContext.currentTime)
        oscillator2.stop(audioContext.currentTime + 0.3)
      }, 200)
      
      // Tercer beep
      setTimeout(() => {
        const oscillator3 = audioContext.createOscillator()
        const gainNode3 = audioContext.createGain()
        
        oscillator3.connect(gainNode3)
        gainNode3.connect(audioContext.destination)
        
        oscillator3.frequency.value = 800
        oscillator3.type = 'sine'
        
        gainNode3.gain.setValueAtTime(0.5, audioContext.currentTime)
        gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator3.start(audioContext.currentTime)
        oscillator3.stop(audioContext.currentTime + 0.3)
      }, 400)
      
    } catch (error) {
      console.error('❌ Error reproduciendo sonido:', error)
    }
  }

  function showBrowserNotification(title: string, body: string) {
    console.log('📱 Mostrando notificación:', title, body)
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        requireInteraction: true,
      })
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const menuItems = [
    {
      group: 'Inicio',
      items: [
        { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
        { href: '/dashboard/products', label: 'Productos', icon: Package },
        { href: '/dashboard/products/categories', label: 'Categorías', icon: FolderOpen },
        { href: '/dashboard/delivery-settings', label: 'Config. de Entrega', icon: Bike },
        { href: '/dashboard/settings', label: 'Config. de Empresa', icon: Settings },
        { href: '/dashboard/qr', label: 'Códigos QR', icon: QrCode },
        { href: '/dashboard/orders', label: 'Pedidos', icon: ShoppingCart, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
      ]
    },
    {
      group: 'General',
      items: [
        { href: '/dashboard/stats', label: 'Ventas', icon: TrendingUp },
        { href: '/dashboard/customers', label: 'Clientes', icon: Users },
        { href: '/dashboard/inventory', label: 'Inventario', icon: Boxes },
      ]
    }
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r flex-col z-20">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: company?.primary_color || '#F97316' }}
              >
                {company?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg">{company?.name || 'Panel'}</h1>
              <p className="text-xs text-gray-500">
                {company?.type === 'restaurant' ? 'Restaurante' : 'Tienda'} • Plan {company?.plan?.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Menú */}
        <nav className="flex-1 overflow-y-auto p-4">
          {menuItems.map(group => (
            <div key={group.group} className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </div>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t space-y-2">
          <Link href="/dashboard/plans">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Crown className="w-4 h-4 text-orange-500" />
              Planes
            </Button>
          </Link>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2 text-red-600">
            <LogOut className="w-4 h-4" />
            Salir
          </Button>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 bg-white flex-col z-50">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {company?.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: company?.primary_color || '#F97316' }}
                  >
                    {company?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="font-bold text-lg">{company?.name || 'Panel'}</h1>
                  <p className="text-xs text-gray-500">Plan {company?.plan?.toUpperCase()}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              {menuItems.map(group => (
                <div key={group.group} className="mb-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">
                    {group.group}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            active
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5" />
                            {item.label}
                          </div>
                          {item.badge && item.badge > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t space-y-2">
              <Link href="/dashboard/plans">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Crown className="w-4 h-4 text-orange-500" />
                  Planes
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2 text-red-600">
                <LogOut className="w-4 h-4" />
                Salir
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header Mobile */}
        <header className="lg:hidden bg-white border-b sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {company?.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: company?.primary_color || '#F97316' }}
                >
                  {company?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold">{company?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}