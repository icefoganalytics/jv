export enum RecoveryStatuses {
  draft = "Draft",
  purchaseApproved = "Purchase Approved",
  reDraft = "Re-Draft",
  routedForApproval = "Routed For Approval",
}

export type Recovery = {
  recoveryID: number // primary key
  journalID: number | null
  firstName: string
  lastName: string
  department: string
  branch: string | null
  refNum: string | null
  createDate: string
  createUser: string
  modUser: string | null
  status: RecoveryStatuses | null
  submissionDate: string | null
  completeDate: string | null
  completeUser: string | null
  totalPrice: number | null
  mailcode: string | null
  employeeBranch: string | null
  description: string | null
  declineRequest: boolean | null
  reasonForDecline: string | null
  employeeUnit: string | null
  requastorEmail: string | null
  glCode: string | null
  fiscal_year: string | null
  supplier: string | null
}

export const RECOVERY_WHERE_OPTIONS = Object.freeze(["department"])
