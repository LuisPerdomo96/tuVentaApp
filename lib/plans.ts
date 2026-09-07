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
  maxVariantsPerProduct: number // ← NUEVO: 0 = sin variantes (Free)
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
    maxStores: 1, maxEmployees: 1, maxPaymentMethods: 1,
    maxVariantsPerProduct: 0,   // ← SIN VARIANTES
    monthlyVisits: 250,
    customSlug: false, installments: false, showPoweredBy: true,
    advancedCustomization: false, advancedStats: false, advancedInventory: false,
    support: 'standard',
  },
  pro: {
    id: 'pro', name: 'Pro', price: 4.99, billing: 'monthly',
    maxProducts: 100, maxImagesPerProduct: 3, maxCategories: 5, maxQrCodes: 5,
    maxStores: 1, maxEmployees: 3, maxPaymentMethods: 4,
    maxVariantsPerProduct: 10,  // ← 10 variantes
    monthlyVisits: 600,
    customSlug: true, installments: true, showPoweredBy: false,
    advancedCustomization: true, advancedStats: true, advancedInventory: true,
    support: 'priority',
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 19.99, billing: 'quarterly', popular: true,
    maxProducts: 600, maxImagesPerProduct: 7, maxCategories: Infinity, maxQrCodes: Infinity,
    maxStores: 1, maxEmployees: Infinity, maxPaymentMethods: Infinity,
    maxVariantsPerProduct: Infinity, // ← ILIMITADO
    monthlyVisits: Infinity,
    customSlug: true, installments: true, showPoweredBy: false,
    advancedCustomization: true, advancedStats: true, advancedInventory: true,
    support: 'dedicated',
  },
}

// --- Helpers ---

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

export const canAddProduct = (plan: PlanDef, currentCount: number): boolean =>
  currentCount < plan.maxProducts

// === ENFORCEMENT (server-side) ===

export const limitMessage = (plan: PlanDef, label: string, max: number): string =>
  `Tu plan ${plan.name} permite hasta ${formatLimit(max)} ${label}. Mejorá tu plan para agregar más.`

export const checkProductLimit = (plan: PlanDef, current: number) =>
  current >= plan.maxProducts ? limitMessage(plan, 'productos', plan.maxProducts) : null

export const checkCategoryLimit = (plan: PlanDef, current: number) =>
  current >= plan.maxCategories ? limitMessage(plan, 'categorías', plan.maxCategories) : null

export const checkQrLimit = (plan: PlanDef, current: number) =>
  current >= plan.maxQrCodes ? limitMessage(plan, 'códigos QR', plan.maxQrCodes) : null

export const checkPaymentMethodsLimit = (plan: PlanDef, current: number) =>
  current >= plan.maxPaymentMethods ? limitMessage(plan, 'métodos de pago', plan.maxPaymentMethods) : null

export const checkImagesPerProduct = (plan: PlanDef, current: number) =>
  current > plan.maxImagesPerProduct
    ? `Tu plan ${plan.name} permite hasta ${plan.maxImagesPerProduct} imagen(es) por producto.`
    : null

// ← NUEVO: validación de límite de variantes
export const checkVariantsLimit = (plan: PlanDef, current: number) => {
  if (plan.maxVariantsPerProduct === 0) {
    return `Las variantes de producto no están disponibles en el plan ${plan.name}. Actualizá a Pro para desbloquearlas.`
  }
  if (current >= plan.maxVariantsPerProduct) {
    return limitMessage(plan, 'variantes por producto', plan.maxVariantsPerProduct)
  }
  return null
}

export type PlanFeature =
  | 'advancedCustomization' | 'customSlug' | 'installments'
  | 'advancedStats' | 'advancedInventory'

export const featureLabel: Record<PlanFeature, string> = {
  advancedCustomization: 'personalización avanzada',
  customSlug: 'slug / URL personalizada',
  installments: 'apartados y abonos',
  advancedStats: 'estadísticas avanzadas',
  advancedInventory: 'inventario avanzado',
}

export const checkFeature = (plan: PlanDef, feature: PlanFeature) =>
  plan[feature] ? null : `La función "${featureLabel[feature]}" no está incluida en el plan ${plan.name}.`

export const DEFAULT_COMPANY_THEME = {
  primary_color: '#F97316',
  secondary_color: '#EAB308',
  accent_color: '#22C55E',
  background_color: '#F9FAFB',
  font_family: 'sans',
  layout_type: 'grid',
  show_prices: true,
  show_descriptions: true,
  show_images: true,
} as const