import { type Ref, reactive, toRefs, ref, unref, watch } from "vue"

import journalsApi, {
  type Journal,
  type JournalWhereOptions,
  type JournalQueryOptions,
  type JournalFiltersOptions,
} from "@/api/journals-api"

export {
  type Journal,
  type JournalWhereOptions,
  type JournalQueryOptions,
  type JournalFiltersOptions,
}

export function useJournals(
  queryOptions: Ref<JournalQueryOptions> = ref({}),
  { skipWatchIf = () => false }: { skipWatchIf?: () => boolean } = {}
) {
  const state = reactive<{
    journals: Journal[]
    totalCount: number
    isLoading: boolean
    isErrored: boolean
  }>({
    journals: [],
    totalCount: 0,
    isLoading: false,
    isErrored: false,
  })

  async function fetch(): Promise<Journal[]> {
    state.isLoading = true
    try {
      const { journals, totalCount } = await journalsApi.list(unref(queryOptions))
      state.isErrored = false
      state.journals = journals
      state.totalCount = totalCount
      return journals
    } catch (error) {
      console.error("Failed to fetch departments:", error)
      state.isErrored = true
      throw error
    } finally {
      state.isLoading = false
    }
  }

  watch(
    () => [skipWatchIf(), unref(queryOptions)],
    async ([skip]) => {
      if (skip) return

      await fetch()
    },
    { deep: true, immediate: true }
  )

  return {
    ...toRefs(state),
    fetch,
    refresh: fetch,
  }
}

export default useJournals
