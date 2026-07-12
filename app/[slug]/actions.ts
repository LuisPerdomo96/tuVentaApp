'use server'

import { createClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'

export async function createOrder(formData: FormData) {
  const supabase = await createClient()

  try {
    const slug = formData.get('slug') as string
    
    if (!slug) {
      return { error: 'Slug no proporcionado' }
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, whatsapp_number, exchange_rate')
      .eq('slug', slug.toLowerCase())
      .single()

    if (companyError || !company) {
      console.error('Error buscando empresa:', companyError)
      return { error: 'Empresa no encontrada' }
    }

    const customerName = formData.get('customerName') as string
    const customerPhone = formData.get('customerPhone') as string
    const customerAddress = formData.get('customerAddress') as string
    const deliveryType = formData.get('deliveryType') as string
    const tableNumber = formData.get('tableNumber') as string
    const notes = formData.get('notes') as string
    const paymentMethod = formData.get('paymentMethod') as string
    const paymentReference = formData.get('paymentReference') as string
    const paymentScreenshotUrl = formData.get('paymentScreenshotUrl') as string
    const totalUsd = parseFloat(formData.get('totalUsd') as string)
    const paymentType = formData.get('paymentType') as string || 'full'
    const initialPayment = parseFloat(formData.get('initialPayment') as string) || totalUsd
    const remainingBalance = totalUsd - initialPayment
    const itemsJson = formData.get('items') as string
    const items = JSON.parse(itemsJson)

    if (!customerName || customerName.length < 2) {
      return { error: 'El nombre es obligatorio' }
    }

    if (!customerPhone || customerPhone.length < 10) {
      return { error: 'El teléfono es obligatorio' }
    }

    if (deliveryType === 'delivery' && !customerAddress) {
      return { error: 'La dirección es obligatoria para delivery' }
    }

    if (deliveryType === 'table' && !tableNumber) {
      return { error: 'El número de mesa es obligatorio' }
    }

    if (!paymentMethod) {
      return { error: 'Selecciona un método de pago' }
    }

    // Verificar stock
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.productId)
        .single()

      if (!product || product.stock < item.quantity) {
        return { error: `Stock insuficiente para: ${item.name}` }
      }
    }

    // Determinar status inicial
    let initialStatus = 'payment_review'
    
    if (paymentType === 'installment') {
      initialStatus = initialPayment > 0 ? 'installment_active' : 'pending_payment'
    } else if (paymentReference) {
      initialStatus = 'payment_review'
    } else {
      initialStatus = 'pending_payment'
    }

    // Crear pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        company_id: company.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress || null,
        delivery_type: deliveryType,
        total_usd: totalUsd,
        status: initialStatus,
        payment_reference: paymentReference || null,
        payment_screenshot_url: paymentScreenshotUrl || null,
        notes: notes || null,
        payment_type: paymentType,
        initial_payment: initialPayment,
        remaining_balance: remainingBalance,
        paid_amount: initialPayment,
        pending_amount: remainingBalance,
        total_installments: paymentType === 'installment' ? Math.ceil(remainingBalance / initialPayment) : 0,
        installments_paid: initialPayment > 0 ? 1 : 0,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creando pedido:', orderError)
      return { error: 'Error al crear el pedido: ' + (orderError?.message || '') }
    }

    // Crear items
    for (const item of items) {
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price_usd: item.price,
        notes: item.notes || null,
      })

      await supabase.rpc('decrement_stock', {
        product_id: item.productId,
        quantity: item.quantity,
      })
    }

    revalidatePath(`/${slug}`)

    return {
      success: true,
      orderId: order.id,
      whatsappNumber: company.whatsapp_number,
    }
  } catch (error: any) {
    console.error('Error en createOrder:', error)
    return { error: 'Error inesperado: ' + error.message }
  }
}

export async function uploadOrderScreenshot(file: FormData) {
  const supabase = await createClient()

  const imageFile = file.get('image') as File
  if (!imageFile) return { error: 'No se seleccionó imagen' }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(imageFile.type)) {
    return { error: 'Solo se permiten JPG, PNG o WebP' }
  }

  if (imageFile.size > 5 * 1024 * 1024) {
    return { error: 'La imagen no puede superar 5MB' }
  }

  const fileExt = imageFile.name.split('.').pop()
  const fileName = `orders/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, imageFile, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName)

  return { success: true, url: publicUrl }
}

// ✅ NUEVA FUNCIÓN: Registrar abono desde el cliente
export async function registerClientPayment(formData: FormData) {
  const supabase = await createClient()

  try {
    const orderId = formData.get('orderId') as string
    const customerPhone = formData.get('customerPhone') as string
    const amount = parseFloat(formData.get('amount') as string)
    const paymentMethod = formData.get('paymentMethod') as string
    const paymentReference = formData.get('paymentReference') as string
    const paymentScreenshotUrl = formData.get('paymentScreenshotUrl') as string
    const notes = formData.get('notes') as string

    if (!orderId || !amount || amount <= 0) {
      return { error: 'Datos inválidos' }
    }

    // Verificar que el pedido existe
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { error: 'Pedido no encontrado' }
    }

    // Verificar que el teléfono coincide
    if (order.customer_phone !== customerPhone) {
      return { error: 'El teléfono no coincide con el pedido' }
    }

    // Verificar que sea un apartado
    if (order.payment_type !== 'installment') {
      return { error: 'Este pedido no es un apartado' }
    }

    // Verificar que aún tenga saldo pendiente
    const currentPending = order.pending_amount || order.remaining_balance || 0
    if (currentPending <= 0) {
      return { error: 'Este pedido ya está completamente pagado' }
    }

    // Verificar que el monto no exceda el pendiente
    if (amount > currentPending) {
      return { error: `El monto no puede exceder $${currentPending.toFixed(2)}` }
    }

    // Calcular nuevos montos
    const currentPaid = order.paid_amount || order.initial_payment || 0
    const newPaidAmount = currentPaid + amount
    const newPendingAmount = Math.max(0, order.total_usd - newPaidAmount)

    // Determinar nuevo status
    let newStatus = order.status
    if (newPendingAmount <= 0) {
      newStatus = 'installment_completed'
    } else if (order.status === 'payment_review') {
      newStatus = 'installment_active'
    }

    // Registrar el pago
    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert({
        order_id: orderId,
        amount: amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        payment_screenshot_url: paymentScreenshotUrl || null,
        notes: notes || null,
      })

    if (paymentError) {
      console.error('Error registrando pago:', paymentError)
      return { error: 'Error al registrar el pago' }
    }

    // Actualizar el pedido
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid_amount: newPaidAmount,
        pending_amount: newPendingAmount,
        remaining_balance: newPendingAmount,
        status: newStatus,
        last_payment_date: new Date().toISOString(),
        installments_paid: (order.installments_paid || 0) + 1,
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error actualizando pedido:', updateError)
      return { error: 'Error al actualizar el pedido' }
    }

    return { 
      success: true, 
      message: 'Abono registrado correctamente',
      isFullyPaid: newPendingAmount <= 0,
      newPendingAmount: newPendingAmount,
      newPaidAmount: newPaidAmount
    }
  } catch (error: any) {
    console.error('Error en registerClientPayment:', error)
    return { error: 'Error inesperado: ' + error.message }
  }
}