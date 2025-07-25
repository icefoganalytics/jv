import http from "@/api/http-client"

import { FiltersOptions, WhereOptions, type Policy } from "@/api/base-api"
import { Recovery } from "@/api/recoveries-api"

/** Keep in sync with api/src/models/journal.ts */
export enum JournalStatuses {
  DRAFT = "Draft",
  COMPLETE = "Complete",
}

export type JournalAudit = {
  auditID: number
  date: string
  journalID: number
  action: string
  user: string
}

export type Journal = {
  journalID: number
  submissionDate: string
  jvNum: string
  department: string
  period: number
  jvAmount: number
  status: JournalStatuses
  jvDate: string
  fiscalYear: string
  description: string
  orgDepartment: string
  odCompletedBy: string
  recvDepartment: string
  rdCompletedBy: string
  explanation: string
  recoveries: Recovery[]
  docName: { docName: string }[]
  journalAudits: JournalAudit[]
  journalItems: Array<Recovery | Partial<Recovery>>
  journal: { jvNum: string }
  action?: string
  // Associations
  // add as needed
}

export type JournalDocument = {
  documentID: number
  docName: string
  itemCatName: string

  document?: { data: number[] }
}

export type JournalWhereOptions = WhereOptions<Journal, "journalID">

// eslint-disable-next-line @typescript-eslint/ban-types
export type JournalFiltersOptions = FiltersOptions<{
  search: string
  searchStatus: string | string[]
  searchDepartment: string | string[]
}>

export type JournalQueryOptions = {
  where?: JournalWhereOptions
  filters?: JournalFiltersOptions
  page?: number
  perPage?: number
}

export const journalsApi = {
  async list(params: JournalQueryOptions = {}): Promise<{
    journals: Journal[]
    totalCount: number
  }> {
    const { data } = await http.get("/api/journals", {
      params,
    })
    return data
  },
  async get(journalId: number): Promise<{
    journal: Journal
    policy: Policy
  }> {
    const { data } = await http.get(`/api/journals/${journalId}`)
    return data
  },
  async create(
    attributes: Partial<Journal>,
    recoveryIDs?: number[]
  ): Promise<{
    journal: Journal
  }> {
    const { data } = await http.post("/api/journals", { ...attributes, recoveryIDs })
    return data
  },
  async update(
    journalId: number,
    attributes: Partial<Journal>,
    recoveryIDs?: number[]
  ): Promise<{
    journal: Journal
  }> {
    const { data } = await http.put(`/api/journals/${journalId}`, { ...attributes, recoveryIDs })
    return data
  },
  async delete(journalId: number): Promise<void> {
    const { data } = await http.delete(`/api/journals/${journalId}`)
    return data
  },

  async upload(journalId: number, body: object): Promise<void> {
    await http.post(`/api/journals/backup-documents/${journalId}`, body, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },

  async deleteUpload(journalId: number, docId: number): Promise<void> {
    await http.delete(`/api/journals/${journalId}/backup-documents/${docId}`)
  },
}

export default journalsApi
