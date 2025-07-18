<template>
  <div>
    <SimpleCard>
      <div class="d-flex mb-4">
        <v-btn
          color="primary"
          text="Add Journal"
          :to="{ name: 'JournalCreatePage' }"
        />
      </div>
      <JournalsDataTableServer
        class="striped"
        @click:row="openJournal"
      />
    </SimpleCard>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router"

import useBreadcrumbs from "@/use/use-breadcrumbs"
import { Journal } from "@/use/use-journals"

import SimpleCard from "@/components/common/SimpleCard.vue"
import JournalsDataTableServer from "@/components/journals/JournalsDataTableServer.vue"

const router = useRouter()

function openJournal(_event: MouseEvent, { item }: { item: Journal }) {
  router.push({ name: "JournalPage", params: { id: item.journalID } })
}

useBreadcrumbs("Journals", [{ title: "Journals", to: { name: "JournalsPage" }, disabled: true }])
</script>
