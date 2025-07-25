<template>
  <v-autocomplete
    :model-value="modelValue"
    :loading="isLoading"
    :items="recoveries"
    item-value="recoveryID"
    :item-title="formatRecoveryTitle"
    label="Click here to select"
    auto-select-first
    chips
    hide-selected
    clearable
    multiple
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from "vue"

import { MAX_PER_PAGE } from "@/api/base-api"
import useRecoveries, { Recovery, type RecoveryWhereOptions } from "@/use/use-recoveries"
import formatCurrency from "@/utils/format-currency"

const propss = withDefaults(
  defineProps<{
    modelValue: number[] | null | undefined
    where?: RecoveryWhereOptions
  }>(),
  {
    where: () => ({}),
  }
)

const emit = defineEmits<{
  "update:modelValue": [number[] | null | undefined]
}>()

const recoveriesQuery = computed<{
  where?: RecoveryWhereOptions
}>(() => {
  return {
    where: propss.where,
    perPage: MAX_PER_PAGE,
  }
})

const { recoveries, isLoading } = useRecoveries(recoveriesQuery)

function formatRecoveryTitle(item: Recovery) {
  return `${item.branch} (${formatCurrency(item.totalPrice)}) - ${item.description}`
}
</script>
