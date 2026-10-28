import type { ReqStatus } from '@/generated/prisma/enums'

export const STATUSES: ReqStatus[] = ['NOT_STARTED', 'PARTIAL', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED']

export const STATUS_LABEL: Record<ReqStatus, string> = {
  NOT_STARTED: 'Not started',
  PARTIAL: 'Partial',
  READY_FOR_REVIEW: 'Ready for review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const STATUS_COLOR: Record<ReqStatus, string> = {
  NOT_STARTED: 'gray',
  PARTIAL: 'yellow',
  READY_FOR_REVIEW: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
}
