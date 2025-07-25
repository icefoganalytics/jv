<template>
  <v-autocomplete
    label="Department"
    :items="departments"
    item-title="name"
    item-value="name"
  />
</template>

<script setup lang="ts">
import { ref } from "vue"

import useDepartments from "@/use/use-departments"

const { departments } = useDepartments(ref({}))
</script>
