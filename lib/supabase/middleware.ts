import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si NO está logueado y va a rutas protegidas → /login
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/onboarding') ||
      request.nextUrl.pathname.startsWith('/admin')) // NUEVO: proteger /admin
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si está logueado y va a /login o /register → /dashboard
  if (
    user &&
    (request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/register')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // =================================================================
  // NUEVO: Protección 2FA para rutas de Admin
  // =================================================================
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const isVerifyPage = request.nextUrl.pathname === '/admin/2fa/verify'
    const pendingUserId = request.cookies.get('2fa_pending_user')?.value
    const isVerified = request.cookies.get('2fa_verified')?.value === 'true'

    // A) Si tiene sesión pendiente de 2FA, FORZAR a ir a la página de verificación
    if (pendingUserId && !isVerifyPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/2fa/verify'
      return NextResponse.redirect(url)
    }

    // B) Si ya está verificado, no dejar que entre a la página de verificación
    if (isVerified && isVerifyPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }
  // =================================================================

  // Si está logueado y va a /dashboard, verificar si tiene empresa
  if (user && request.nextUrl.pathname === '/dashboard') {
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
    
    if (!companies || companies.length === 0) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Si está logueado, tiene empresa y va a /onboarding → /dashboard
  if (user && request.nextUrl.pathname === '/onboarding') {
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
    
    if (companies && companies.length > 0) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}