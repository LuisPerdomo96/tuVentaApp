import { Suspense } from 'react'
import LoginForm from './login-form'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-11 bg-slate-200 rounded" />
            <div className="h-11 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}