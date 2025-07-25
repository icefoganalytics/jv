<template>
  <SimpleCard title="Journal Details">
    <template #rightTitle>
      <v-btn
        color="error"
        variant="outlined"
        text="Go Back"
        @click="goToJournalsPage"
      />
    </template>

    <JournalCreateForm @created="goToJournalsPage" />
  </SimpleCard>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router"

import useBreadcrumbs from "@/use/use-breadcrumbs"

import SimpleCard from "@/components/common/SimpleCard.vue"
import JournalCreateForm from "@/components/journals/JournalCreateForm.vue"

const router = useRouter()

function goToJournalsPage() {
  router.push({ name: "JournalsPage" })
}

useBreadcrumbs("Create New Journal", [
  { title: "Journals", to: { name: "JournalsPage" } },
  { title: "Create New Journal", to: { name: "JournalCreatePage" }, disabled: true },
])
</script>
