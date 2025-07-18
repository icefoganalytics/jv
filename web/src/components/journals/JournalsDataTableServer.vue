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

<script lang="ts" setup>
import formatDate from "@/utils/format-date"
import formatMoney from "@/utils/format-currency"

import useJournals from "@/use/use-journals"

const headers = [
  { title: "Date", value: "submissionDate" },
  { title: "JV Number", value: "jvNum" },
  { title: "Department", value: "department" },
  { title: "Period", value: "period" },
  { title: "Affiliated Recoveries", value: "refRecoveries" },
  { title: "Description", value: "description" },
  { title: "Amount", value: "jvAmount" },
  { title: "Status", value: "status" },
]

const { journals, totalCount, isLoading, refresh } = useJournals()

defineExpose({
  refresh,
})
</script>
