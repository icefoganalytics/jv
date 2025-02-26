import { isUndefined } from "lodash"
import { reactive, toRefs } from "vue"
import { RouteLocationRaw } from "vue-router"

export type Breadcrumb = {
  title: string
  disabled?: boolean
  exact?: boolean
  to: RouteLocationRaw
}

const BASE_CRUMB = {
  title: "Home",
  disabled: false,
  to: {
    name: "DashboardPage",
  },
}

// Global state for breadcrumbs
const state = reactive<{
  breadcrumbs: Breadcrumb[]
  title: string | null
  showTopBar: boolean
}>({
  breadcrumbs: [],
  title: null,
  showTopBar: true,
})

export function useBreadcrumbs(title?: string, breadcrumbs?: Breadcrumb[], showTopBar?: boolean) {
  if (!isUndefined(title)) state.title = title
  if (!isUndefined(breadcrumbs)) {
    if (breadcrumbs.length > 0) {
      state.breadcrumbs = [BASE_CRUMB, ...breadcrumbs]
    } else {
      state.breadcrumbs = [...breadcrumbs]
    }
  }
  state.showTopBar = isUndefined(showTopBar) ? false : (showTopBar ?? false)

  return {
    ...toRefs(state),
    update: useBreadcrumbs,
  }
}

export default useBreadcrumbs
