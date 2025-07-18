import http from "@/api/http-client"
import { type Policy } from "@/api/base-api"

/** Keep in sync with api/src/models/recovery.ts */

export type RecoveryItem = {
  approvalCost?: number | null
  changeQuantity: boolean
  clientChange?: string | null
  declineRequest?: string | null
  description: string
  filledBy?: string | null
  itemCatID?: number | null
  itemID?: number
  orderFilled?: boolean
  quantity: number
  reasonForDecline?: string
  recoveryID?: number
  totalPrice: number | string
  unitPrice: number

  revisedCost?: number | string
  approvedCost?: number | string

  category?: string
  originalQuantity?: number
}

export type RecoverAudit = {
  auditID: number
  date: string
  recoveryID: number
  action: string
  user: string
}

export type Recovery = {
  recoveryID: number
  journalID: number
  firstName: string
  lastName: string
  supplier: string
  department: string
  branch: string
  refNum: string
  createDate: string
  createUser: string
  modUser: string
  status: string
  submissionDate: string
  completeDate: string
  completeUser: string
  totalPrice: number
  mailcode: string
  employeeBranch: string
  description: string
  declineRequest: boolean
  reasonForDecline: string
  employeeUnit: string
  requastorEmail: string
  glCode: string
  fiscal_year: string

  docName: RecoveryDocument[]
  recoveryAudits: RecoverAudit[]
  recoveryItems: Array<RecoveryItem | Partial<RecoveryItem>>
  journal: { jvNum: string }
  action?: string

  // Associations
  // add as needed
}

export type RecoveryDocument = {
  documentID: number
  docName: string
  itemCatName: string

  document?: { data: number[] }
}

export type RecoveryWhereOptions = {
  department?: string
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type RecoveryFiltersOptions = {}

export const recoveriesApi = {
  async list(
    params: {
      where?: RecoveryWhereOptions
      filters?: RecoveryFiltersOptions
      page?: number
      perPage?: number
    } = {}
  ): Promise<{
    recoveries: Recovery[]
    totalCount: number
  }> {
    const { data } = await http.get("/api/recoveries", {
      params,
    })
    return data
  },
  async get(recoveryId: number): Promise<{
    recovery: Recovery
    policy: Policy
  }> {
    const { data } = await http.get(`/api/recoveries/${recoveryId}`)
    return data
  },
  async create(attributes: Partial<Recovery>): Promise<{
    recovery: Recovery
  }> {
    const { data } = await http.post("/api/recoveries", attributes)
    return data
  },
  async update(
    recoveryId: number,
    attributes: Partial<Recovery>
  ): Promise<{
    recovery: Recovery
  }> {
    const { data } = await http.put(`/api/recoveries/${recoveryId}`, attributes)
    return data
  },
  async delete(recoveryId: number): Promise<void> {
    const { data } = await http.delete(`/api/recoveries/${recoveryId}`)
    return data
  },

  async upload(recoveryId: number, body: object): Promise<void> {
    await http.post(`/api/recoveries/backup-documents/${recoveryId}`, body, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },

  async deleteUpload(recoveryId: number, docId: number): Promise<void> {
    await http.delete(`/api/recoveries/${recoveryId}/backup-documents/${docId}`)
  },

  async getUpload(recoveryId: number, docId: number): Promise<ArrayBuffer | null> {
    const { data } = await http.get(`/api/recoveries/backup-documents/${recoveryId}/${docId}`, {
      responseType: "arraybuffer",
    })
    return data
  },
}

export default recoveriesApi
