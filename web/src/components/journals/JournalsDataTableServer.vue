<template>
  <v-data-table-server
    :headers="headers"
    :items="journals"
    :items-per-page="10"
    :items-length="totalCount"
    :loading="isLoading"
  >
    <template #item.submissionDate="{ item }">
      {{ formatDate(item.submissionDate) }}
    </template>

    <template #item.jvAmount="{ item }">
      {{ formatMoney(item.jvAmount) }}
    </template>
  </v-data-table-server>
</template>

<script lang="ts">
export const DEFAULT_HEADERS = [
  { title: "Date", key: "submissionDate" },
  { title: "JV Number", key: "jvNum" },
  { title: "Department", key: "department" },
  { title: "Period", key: "period" },
  { title: "Affiliated Recoveries", key: "refRecoveries" },
  { title: "Description", key: "description" },
  { title: "Amount", key: "jvAmount" },
  { title: "Status", key: "status" },
]
</script>

<script lang="ts" setup>
import { computed } from "vue"
import { useRouteQuery } from "@vueuse/router"

import formatDate from "@/utils/format-date"
import formatMoney from "@/utils/format-currency"
import { integerTransformer } from "@/utils/use-route-query-transformers"

import useJournals, {
  type JournalQueryOptions,
  type JournalFiltersOptions,
  type JournalWhereOptions,
} from "@/use/use-journals"

const props = withDefaults(
  defineProps<{
    headers?: { title: string; key: string }[]
    filters?: JournalFiltersOptions
    where?: JournalWhereOptions
    waiting?: boolean
    routeQuerySuffix?: string
  }>(),
  {
    headers: () => DEFAULT_HEADERS,
    filters: () => ({}),
    where: () => ({}),
    waiting: false,
    routeQuerySuffix: "Journals",
  }
)

const page = useRouteQuery<string, number>(`page${props.routeQuerySuffix}`, "1", {
  transform: integerTransformer,
})

const perPage = useRouteQuery<string, number>(`perPage${props.routeQuerySuffix}`, "10", {
  transform: integerTransformer,
})

const journalsQuery = computed<JournalQueryOptions>(() => {
  return {
    where: props.where,
    filters: props.filters,
    perPage: perPage.value,
    page: page.value,
  }
})

const { journals, totalCount, isLoading, refresh } = useJournals(journalsQuery, {
  skipWatchIf: () => props.waiting,
})

defineExpose({
  refresh,
})
</script>
