export type ComputedStatus = 'upcoming' | 'needs-invoice' | 'invoiced' | 'paid'

export function computeJobStatus(
  status: string,
  invoices: { status: string }[]
): ComputedStatus {
  // Invoice state always takes precedence
  const hasPaid = invoices.some(i => i.status === 'paid')
  if (hasPaid) return 'paid'
  const hasSent = invoices.some(i => ['sent', 'viewed'].includes(i.status))
  if (hasSent) return 'invoiced'
  if (status === 'completed' || status === 'done') return 'needs-invoice'
  return 'upcoming'
}

export function jobStatusColor(s: ComputedStatus): string {
  switch (s) {
    case 'upcoming': return '#111111'
    case 'needs-invoice': return '#dc2626'
    case 'invoiced': return '#d97706'
    case 'paid': return '#16a34a'
  }
}

export function jobStatusLabel(s: ComputedStatus): string {
  switch (s) {
    case 'upcoming': return 'upcoming'
    case 'needs-invoice': return 'needs invoice'
    case 'invoiced': return 'invoiced'
    case 'paid': return 'paid'
  }
}
