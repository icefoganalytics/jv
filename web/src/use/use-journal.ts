import { type Ref, reactive, toRefs, unref, watch } from "vue"
import { isNil } from "lodash"

import journalsApi, { type Journal } from "@/api/journals-api"

export { type Journal }

export function useJournal(id: Ref<number | null | undefined>) {
  const state = reactive<{
    journal: Journal | null
    isLoading: boolean
    isErrored: boolean
  }>({
    journal: null,
    isLoading: false,
    isErrored: false,
  })

  async function fetch(): Promise<Journal> {
    const staticId = unref(id)
    if (isNil(staticId)) {
      throw new Error("id is required")
    }

    state.isLoading = true
    try {
      const { journal } = await journalsApi.get(staticId)
      state.isErrored = false
      state.journal = journal
      return journal
    } catch (error) {
      console.error("Failed to fetch journal:", error)
      state.isErrored = true
      throw error
    } finally {
      state.isLoading = false
    }
  }

  async function save(): Promise<Journal> {
    const staticId = unref(id)
    if (isNil(staticId)) {
      throw new Error("id is required")
    }

    if (isNil(state.journal)) {
      throw new Error("No journal to save")
    }

    state.isLoading = true
    try {
      const { journal } = await journalsApi.update(staticId, state.journal)
      state.isErrored = false
      state.journal = journal
      return journal
    } catch (error) {
      console.error("Failed to save journal:", error)
      state.isErrored = true
      throw error
    } finally {
      state.isLoading = false
    }
  }

  watch(
    () => unref(id),
    async (newId) => {
      if (isNil(newId)) return

      await fetch()
    },
    { immediate: true }
  )

  return {
    ...toRefs(state),
    fetch,
    refresh: fetch,
    save,
  }
}

export default useJournal
