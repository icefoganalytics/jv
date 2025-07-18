import http from "@/api/http-client"
import { type Policy } from "@/api/base-api"

/** Keep in sync with api/src/models/department.ts */

export type Department = {
  name: string
  divisions: { name: string; branches: { name: string; units: string[] }[] }[]

  // Associations
  // add as needed
}

export type DepartmentWhereOptions = {
  email?: string
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type DepartmentFiltersOptions = {}

export const departmentsApi = {
  async list(
    params: {
      where?: DepartmentWhereOptions
      filters?: DepartmentFiltersOptions
      page?: number
      perPage?: number
    } = {}
  ): Promise<{
    departments: Department[]
    totalCount: number
  }> {
    const { data } = await http.get("/api/lookup/department-branch", {
      params,
    })
    return data
  },
  async get(departmentId: number): Promise<{
    department: Department
    policy: Policy
  }> {
    const { data } = await http.get(`/api/lookup/department-branch/${departmentId}`)
    return data
  },
  async create(attributes: Partial<Department>): Promise<{
    department: Department
  }> {
    const { data } = await http.post("/api/lookup/department-branch", attributes)
    return data
  },
  async update(
    departmentId: number,
    attributes: Partial<Department>
  ): Promise<{
    department: Department
  }> {
    const { data } = await http.patch(`/api/lookup/department-branch/${departmentId}`, attributes)
    return data
  },
  async delete(departmentId: number): Promise<void> {
    const { data } = await http.delete(`/api/lookup/department-branch/${departmentId}`)
    return data
  },
}

export default departmentsApi
