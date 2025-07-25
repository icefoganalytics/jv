export type Policy = {
  show: boolean
  create: boolean
  update: boolean
  destroy: boolean
}

export type WhereOptions<Model, Attributes extends keyof Model> = {
  [K in Attributes]?: Model[K] | Model[K][]
}

export type FiltersOptions<Options> = Partial<Options>

export type QueryOptions<WhereOptions, FiltersOptions> = Partial<{
  where: WhereOptions
  filters: FiltersOptions
  page: number
  perPage: number
}>

// Keep in sync with api/src/controllers/base-controller.ts
export const MAX_PER_PAGE = 1000
