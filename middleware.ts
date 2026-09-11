import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => 
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Si no hay usuario y va a admin, redirigir a login
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Verificar 2FA para rutas de admin (excepto la página de 2FA y login)
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const is2FAPage = request.nextUrl.pathname === '/admin/2fa'
    const is2FAVerifyPage = request.nextUrl.pathname === '/admin/2fa/verify'
    const isBillingPage = request.nextUrl.pathname === '/admin/billing'
    
    if (!is2FAPage && !is2FAVerifyPage && !isBillingPage) {
      // Verificar si tiene 2FA activado
      const { data: needs2FA } = await supabase.rpc('admin_needs_2fa_verification')
      
      if (needs2FA) {
        // Verificar cookie de verificación
        const isVerified = request.cookies.get('2fa_verified')?.value === 'true'
        
        if (!isVerified) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin/2fa/verify'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}