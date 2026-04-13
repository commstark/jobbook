import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    const { body: messageBody } = body

    if (!messageBody?.trim()) {
      return NextResponse.json({ error: 'Message body required' }, { status: 400 })
    }

    // Get conversation to find the phone number
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('phone, customer_id')
      .eq('id', id)
      .maybeSingle()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Insert message record
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        direction: 'outbound',
        body: messageBody.trim(),
        status: 'queued',
      })
      .select('id, body, direction, status, created_at')
      .single()

    if (msgError) {
      console.error('[POST /api/conversations/:id/messages]', msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Send via Twilio (best effort — don't fail if Twilio errors)
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const fromNumber = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && fromNumber && conversation.phone) {
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: conversation.phone,
              From: fromNumber,
              Body: messageBody.trim(),
            }).toString(),
          }
        )

        if (twilioRes.ok) {
          const twilioData = await twilioRes.json()
          await supabase
            .from('messages')
            .update({ status: 'sent', twilio_sid: twilioData.sid })
            .eq('id', message.id)
          message.status = 'sent'
        } else {
          const errText = await twilioRes.text()
          console.error('[POST /api/conversations/:id/messages] twilio:', errText)
          await supabase.from('messages').update({ status: 'failed' }).eq('id', message.id)
          message.status = 'failed'
        }
      }
    } catch (twilioErr) {
      console.error('[POST /api/conversations/:id/messages] twilio exception:', twilioErr)
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), status: 'open' })
      .eq('id', id)

    return NextResponse.json({ message })
  } catch (err) {
    console.error('[POST /api/conversations/:id/messages] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
