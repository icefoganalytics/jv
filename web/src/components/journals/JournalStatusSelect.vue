<template>
  <v-select
    :model-value="modelValue"
    :items="JOURNAL_STATUSES"
    label="Status"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { ref } from "vue"

import { JournalStatuses } from "@/api/journals-api"

defineProps<{
  modelValue: JournalStatuses | null | undefined
}>()

const emit = defineEmits(["update:modelValue"])

const JOURNAL_STATUSES = ref([
  {
    title: "Draft",
    value: JournalStatuses.DRAFT,
  },
  {
    title: "Complete",
    value: JournalStatuses.COMPLETE,
  },
])
</script>
