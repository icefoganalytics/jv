<template>
  <v-skeleton-loader
    v-if="isNil(journal)"
    type="card"
  />
  <div v-else>
    <div class="mb-4 d-flex pt-2">
      <v-chip
        color="warning"
        class="mr-3"
        variant="flat"
      >
        <strong>Status:</strong>&nbsp;{{ journal.status }}
      </v-chip>
    </div>

    <TabCard
      :tabs="[
        { value: 0, title: 'Journal Details', icon: 'mdi-file-document' },
        { value: 1, title: 'Audit History', icon: 'mdi-history' },
      ]"
      :default-tab="0"
    >
      <v-tabs-window-item value="0">
        <JournalViewForm
          class="mt-5"
          :journal-id="journalIdNumber"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="1">
        <v-data-table
          :items="journal.journalAudits"
          :headers="[
            { title: 'Date', value: 'date' },
            { title: 'User', value: 'user' },
            { title: 'Action', value: 'action' },
          ]"
          :items-per-page="10"
        >
          <template #item.date="{ item }">
            <span>{{ formatDateTime(item.date) }}</span>
          </template>
        </v-data-table>
      </v-tabs-window-item>
    </TabCard>
  </div>
</template>

<script lang="ts" setup>
import { isNil } from "lodash"
import { computed } from "vue"

import { formatDateTime } from "@/utils/format-date"

import useBreadcrumbs from "@/use/use-breadcrumbs"
import useJournal from "@/use/use-journal"

import TabCard from "@/components/common/TabCard.vue"
import JournalViewForm from "@/components/journals/JournalViewForm.vue"

const journalId = defineProps<{ journalId: string }>()
const journalIdNumber = computed(() => parseInt(journalId.journalId))

const { journal } = useJournal(journalIdNumber)

useBreadcrumbs("Journals", [
  { title: "Journals", to: { name: "JournalsPage" } },
  {
    title: "Journal",
    to: { name: "JournalPage", params: { journalId: journalIdNumber.value } },
    disabled: true,
  },
])
</script>
