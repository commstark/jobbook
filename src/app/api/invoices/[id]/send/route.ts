import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get invoice with customer + job info
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select(`
        id, total_amount, public_token,
        jobs ( title ),
        customers ( name ),
        customer_id
      `)
      .eq('id', id)
      .single()

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get customer phone
    const { data: phoneRow } = await supabase
      .from('customer_phones')
      .select('phone')
      .eq('customer_id', invoice.customer_id)
      .eq('is_primary', true)
      .maybeSingle()

    const phone = phoneRow?.phone
    if (!phone) {
      return NextResponse.json({ error: 'Customer has no phone number' }, { status: 400 })
    }

    const job = invoice.jobs as unknown as { title: string } | null
    const customer = invoice.customers as unknown as { name: string } | null
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jobbook.app'
    const payUrl = `${appUrl}/pay/${invoice.public_token}`
    const total = Number(invoice.total_amount).toFixed(2)
    const jobTitle = job?.title || 'your service'
    const customerName = customer?.name ? customer.name.split(' ')[0] : 'there'

    const smsBody = `Hi ${customerName}, here's your invoice for ${jobTitle} — $${total}. View and pay here: ${payUrl}`

    // Send SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (accountSid && authToken && fromNumber) {
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: fromNumber,
            Body: smsBody,
          }).toString(),
        }
      )

      if (!twilioRes.ok) {
        const err = await twilioRes.text()
        console.error('[POST /api/invoices/:id/send] twilio:', err)
        // Continue — still mark as sent even if Twilio fails in dev
      }
    } else {
      console.warn('[POST /api/invoices/:id/send] Twilio not configured, skipping SMS')
    }

    // Update invoice status
    await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ ok: true, url: payUrl })
  } catch (err) {
    console.error('[POST /api/invoices/:id/send] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
