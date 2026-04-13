import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    // Get invoice by public token
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('id, total_amount, jobs(title), customers(name)')
      .eq('public_token', token)
      .single()

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get Stripe account ID from settings
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'stripe_account_id')
      .maybeSingle()

    const stripeAccountId = setting?.value

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jobbook.app'
    const job = invoice.jobs as unknown as { title: string } | null

    // Create Stripe Checkout Session
    const stripeBody: Record<string, string> = {
      'payment_method_types[]': 'card',
      'mode': 'payment',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(Math.round(Number(invoice.total_amount) * 100)),
      'line_items[0][price_data][product_data][name]': job?.title || 'Plumbing Service',
      'line_items[0][quantity]': '1',
      'success_url': `${appUrl}/pay/${token}?paid=1`,
      'cancel_url': `${appUrl}/pay/${token}`,
      'metadata[invoice_id]': invoice.id,
      'metadata[public_token]': token,
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    if (stripeAccountId) {
      headers['Stripe-Account'] = stripeAccountId
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers,
      body: new URLSearchParams(stripeBody).toString(),
    })

    if (!stripeRes.ok) {
      const err = await stripeRes.text()
      console.error('[POST /api/invoices/pay/:token/checkout] stripe:', err)
      return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
    }

    const session = await stripeRes.json()
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[POST /api/invoices/pay/:token/checkout] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
