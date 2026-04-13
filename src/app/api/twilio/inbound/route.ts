import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const from = formData.get('From') as string | null
    const body = formData.get('Body') as string | null
    const numMedia = parseInt((formData.get('NumMedia') as string) || '0')

    if (!from) {
      return new NextResponse('<?xml version="1.0"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const supabase = createAdminClient()

    // Find or create conversation for this phone number
    let conversationId: string | null = null

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone', from)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      conversationId = existing.id
    } else {
      // Try to find customer by phone
      const { data: phoneRow } = await supabase
        .from('customer_phones')
        .select('customer_id')
        .eq('phone', from)
        .maybeSingle()

      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          phone: from,
          customer_id: phoneRow?.customer_id || null,
          status: 'active',
        })
        .select('id')
        .single()

      if (convError) {
        console.error('[twilio/inbound] create conversation:', convError)
      } else {
        conversationId = newConv.id
      }
    }

    if (!conversationId) {
      return new NextResponse('<?xml version="1.0"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Collect media URLs
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const url = formData.get(`MediaUrl${i}`) as string | null
      if (url) mediaUrls.push(url)
    }

    // Insert message (no status column in messages table)
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        direction: 'inbound',
        body: body || '',
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      })

    if (msgError) {
      console.error('[twilio/inbound] insert message:', msgError)
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    // Return empty TwiML — no auto-reply
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[twilio/inbound] unexpected:', err)
    return new NextResponse('<?xml version="1.0"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
