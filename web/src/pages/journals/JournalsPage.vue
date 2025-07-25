<template>
  <SimpleCard>
    <div class="d-flex mb-4">
      <v-btn
        class="mr-4"
        color="primary"
        text="Add Journal"
        :to="{ name: 'JournalCreatePage' }"
      />

      <v-text-field
        v-model="search"
        class="mr-4"
        label="Search"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        style="width: 300px"
      />

      <v-spacer />

      <div class="text-right">
        <v-menu
          width="400"
          offset-y
          location="bottom end"
          :close-on-content-click="false"
          :scrim="true"
        >
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              prepend-icon="mdi-filter"
              append-icon="mdi-chevron-down"
              size="small"
              >Filters ({{ filterCount }})</v-btn
            >
          </template>
          <v-card>
            <v-card-text>
              <v-label class="mb-2">Status:</v-label>
              <v-btn-toggle
                v-model="statusFilter"
                color="primary"
                class="border mb-6"
                density="compact"
                multiple
                style="width: 100%; height: 34px"
              >
                <v-btn
                  value="Draft"
                  size="small"
                  style="width: 50%"
                  text="Draft"
                />
                <v-btn
                  value="Complete"
                  size="small"
                  style="width: 50%"
                  text="Complete"
                />
              </v-btn-toggle>

              <v-label class="mb-2">Client department:</v-label>
              <v-autocomplete
                v-model="departmentFilter"
                :items="departments"
                density="compact"
                multiple
                item-title="name"
                item-value="name"
              />
            </v-card-text>
          </v-card>
        </v-menu>

        <v-menu
          width="400"
          offset-y
          location="bottom end"
          :close-on-content-click="false"
          :scrim="true"
        >
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              icon="mdi-wrench-cog-outline"
              class="ml-2 border"
              size="30"
              variant="tonal"
            ></v-btn>
          </template>
          <v-card>
            <v-card-text>
              <v-label class="mb-2">Table columns:</v-label>
              <v-list class="ma-0 pa-0 ml-n1">
                <v-list-item
                  v-for="header of JOURNALS_DEFAULT_HEADERS"
                  :key="header.key"
                  class="ma-0 pa-0"
                >
                  <template #prepend>
                    <v-checkbox
                      v-model="selectedJournalHeaders"
                      :value="header.key"
                      color="primary"
                      density="compact"
                      hide-details
                      :label="header.title"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-menu>

        <div class="text-right mt-3">
          <v-chip
            v-for="value of statusFilter"
            :key="value"
            color="primary"
            closable
            :border="true"
            size="small"
            class="ml-3"
            :text="`Status: ${value}`"
            @click:close="statusFilter = statusFilter?.filter((s) => s !== value) ?? null"
          />
          <v-chip
            v-for="value of departmentFilter"
            :key="value"
            color="primary"
            closable
            :border="true"
            size="small"
            class="ml-3"
            :text="`${value}`"
            @click:close="departmentFilter = departmentFilter?.filter((s) => s !== value) ?? null"
          />
        </div>
      </div>
    </div>

    <v-data-table-server
      class="striped"
      :headers="journalsHeaders"
      :items="filteredJournals"
      :items-per-page="10"
      :items-length="totalCount"
      :loading="isLoading"
      @click:row="openJournal"
    >
      <template #item.submissionDate="{ item }">
        {{ formatDate(item.submissionDate) }}
      </template>

      <template #item.jvAmount="{ item }">
        {{ formatMoney(item.jvAmount) }}
      </template>
    </v-data-table-server>
  </SimpleCard>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import formatDate from "@/utils/format-date"
import formatMoney from "@/utils/format-currency"

import useBreadcrumbs from "@/use/use-breadcrumbs"
import useJournals, { type Journal } from "@/use/use-journals"
import useDepartments from "@/use/use-departments"

import SimpleCard from "@/components/common/SimpleCard.vue"
import { DEFAULT_HEADERS as JOURNALS_DEFAULT_HEADERS } from "@/components/journals/JournalsDataTableServer.vue"

const { departments } = useDepartments()

const search = ref<string>("")
const statusFilter = ref<string[]>([])
const departmentFilter = ref<string[]>([])

const selectedJournalHeaders = ref<string[]>(JOURNALS_DEFAULT_HEADERS.map((header) => header.key))
const journalsHeaders = computed<{ title: string; key: string }[]>(() => {
  return JOURNALS_DEFAULT_HEADERS.filter((header) => {
    return (
      selectedJournalHeaders.value.length === 0 || selectedJournalHeaders.value.includes(header.key)
    )
  })
})

const { journals, totalCount, isLoading } = useJournals()

const filterCount = computed(() => {
  let count = 0
  if (statusFilter.value.length > 0) count++
  if (departmentFilter.value.length > 0) count++
  return count
})

const filteredJournals = computed(() => {
  return journals.value.filter((journal) => {
    let searchMatch = true
    if (search.value.length > 0) {
      searchMatch =
        journal.jvNum.toLowerCase().includes(search.value.toLowerCase()) ||
        journal.department.toLowerCase().includes(search.value.toLowerCase()) ||
        journal.description.toLowerCase().includes(search.value.toLowerCase())
    }

    let statusMatch = true
    if (statusFilter.value.length > 0) {
      statusMatch = statusFilter.value.length === 0 || statusFilter.value.includes(journal.status)
    }

    const departmentMatch =
      departmentFilter.value.length === 0 || departmentFilter.value.includes(journal.department)
    return statusMatch && departmentMatch && searchMatch
  })
})

const router = useRouter()

function openJournal(_event: MouseEvent, { item }: { item: Journal }) {
  router.push({ name: "JournalPage", params: { journalId: item.journalID } })
}

useBreadcrumbs("Journals", [{ title: "Journals", to: { name: "JournalsPage" }, disabled: true }])
</script>
