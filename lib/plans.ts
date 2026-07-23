// lib/plans.ts — ÚNICA fuente de verdad de los planes y sus límites
// Si cambiás un número acá, se actualiza en TODAS las pantallas que lean de acá.

export type PlanId = 'free' | 'pro' | 'enterprise'
export type Billing = 'none' | 'monthly' | 'quarterly'
export type SupportLevel = 'standard' | 'priority' | 'dedicated'

export interface PlanDef {
  id: PlanId
  name: string
  price: number                 // USD
  billing: Billing
  popular?: boolean
  maxProducts: number           // Infinity = ilimitado
  maxImagesPerProduct: number
  maxCategories: number
  maxQrCodes: number
  maxStores: number             // hoy fijo en 1 (1 correo = 1 tienda)
  maxEmployees: number
  maxPaymentMethods: number
  monthlyVisits: number
  customSlug: boolean           // slug premium / dominio propio
  installments: boolean         // apartados / abonos
  showPoweredBy: boolean        // sello "Powered by tuVentaApp"
  advancedCustomization: boolean
  advancedStats: boolean
  advancedInventory: boolean
  support: SupportLevel
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: 'free', name: 'Gratuito', price: 0, billing: 'none',
    maxProducts: 15, maxImagesPerProduct: 1, maxCategories: 1, maxQrCodes: 1,
    maxStores: 1, maxEmployees: 1, maxPaymentMethods: 1, monthlyVisits: 250,
    customSlug: false, installments: false, showPoweredBy: true,
    advancedCustomization: false, advancedStats: false, advancedInventory: false,
    support: 'standard',
  },
  pro: {
    id: 'pro', name: 'Pro', price: 4.99, billing: 'monthly',
    maxProducts: 100, maxImagesPerProduct: 3, maxCategories: 5, maxQrCodes: 5,
    maxStores: 1, maxEmployees: 3, maxPaymentMethods: 4, monthlyVisits: 600,
    customSlug: true, installments: true, showPoweredBy: false,
    advancedCustomization: true, advancedStats: true, advancedInventory: true,
    support: 'priority',
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 19.99, billing: 'quarterly', popular: true,
    maxProducts: 600, maxImagesPerProduct: 7, maxCategories: Infinity, maxQrCodes: Infinity,
    maxStores: 1, maxEmployees: Infinity, maxPaymentMethods: Infinity, monthlyVisits: Infinity,
    customSlug: true, installments: true, showPoweredBy: false,
    advancedCustomization: true, advancedStats: true, advancedInventory: true,
    support: 'dedicated',
  },
}

// --- Helpers (los usan TODAS las pantallas; así el número vive una sola vez) ---

export const getPlan = (id?: string | null): PlanDef =>
  (id as PlanId) in PLANS ? PLANS[id as PlanId] : PLANS.free

export const formatLimit = (n: number): string =>
  n === Infinity ? 'Ilimitado' : `${n}`

export const formatPrice = (p: PlanDef): string =>
  p.price === 0 ? '$0' : `$${p.price}`

export const formatPeriod = (b: Billing): string =>
  b === 'none' ? 'para siempre' : b === 'monthly' ? '/mes' : 'cada 3 meses'

export const daysForBilling = (b: Billing): number =>
  b === 'monthly' ? 30 : b === 'quarterly' ? 90 : 0

export const supportLabel = (s: SupportLevel): string =>
  s === 'priority' ? 'prioritario' : s === 'dedicated' ? 'dedicado' : 'estándar'

// Regla de negocio reutilizable (la usará el enforcement del servidor después)
export const canAddProduct = (plan: PlanDef, currentCount: number): boolean =>
  currentCount < plan.maxProducts