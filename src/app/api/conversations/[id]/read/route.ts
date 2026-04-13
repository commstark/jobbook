import { NextResponse } from 'next/server'

// conversations table has no unread_count or is_unread column — this is a no-op kept for API compatibility
export async function POST(_req: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ ok: true })
}
