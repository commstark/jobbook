import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio') as Blob | null

    if (!audio) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Transcribe with Whisper
    const whisperForm = new FormData()
    whisperForm.append('file', audio, 'recording.webm')
    whisperForm.append('model', 'whisper-1')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.text()
      console.error('[POST /api/voice/transcribe] whisper:', err)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
    }

    const whisperData = await whisperRes.json()
    const transcript = whisperData.text || ''

    if (!transcript.trim()) {
      return NextResponse.json({ transcript: '', data: {} })
    }

    // Parse with Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const parseRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Extract structured data from this plumbing job voice note. Return ONLY valid JSON with these optional fields:
- title: string (short job title)
- description: string (job details)
- category: one of "Leak", "Install", "Repair", "Drain", "New Construction", "Inspection", "Other"
- is_urgent: boolean
- customer_name: string
- customer_address: string
- quoted_amount: number
- line_items: array of {description, quantity, unit_price}

Voice note: "${transcript}"

JSON:`,
      }],
    })

    let data = {}
    try {
      const content = parseRes.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) data = JSON.parse(jsonMatch[0])
      }
    } catch (parseErr) {
      console.error('[POST /api/voice/transcribe] parse error:', parseErr)
    }

    return NextResponse.json({ transcript, data })
  } catch (err) {
    console.error('[POST /api/voice/transcribe] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
