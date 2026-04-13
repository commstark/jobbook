import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        const stripe = (await import('stripe')).default
        const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '')
        stripeClient.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err) {
        console.error('[POST /api/stripe/webhook] signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const event = JSON.parse(body)
    console.log('[POST /api/stripe/webhook] event type:', event.type)

    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const supabase = createAdminClient()

      const metadata = event.data?.object?.metadata
      const invoiceId = metadata?.invoice_id

      if (invoiceId) {
        // Update invoice to paid
        const { data: invoice, error: invError } = await supabase
          .from('invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', invoiceId)
          .select('job_id')
          .single()

        if (invError) {
          console.error('[POST /api/stripe/webhook] update invoice:', invError)
        }

        // Update job to paid
        if (invoice?.job_id) {
          await supabase
            .from('jobs')
            .update({ status: 'paid' })
            .eq('id', invoice.job_id)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[POST /api/stripe/webhook] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
