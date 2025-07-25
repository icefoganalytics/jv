<template>
  <v-form
    ref="formRef"
    @submit.prevent="validateAndCreate"
  >
    <v-row>
      <v-col cols="4">
        <v-text-field
          v-model="journal.jvNum"
          label="JV Number"
          :rules="[required]"
        />
      </v-col>
      <v-col cols="4">
        <v-number-input
          v-model="journal.period"
          control-variant="hidden"
          label="Period"
          :rules="[required]"
        />
      </v-col>
      <v-col cols="4">
        <v-number-input
          v-model="journal.jvAmount"
          control-variant="hidden"
          label="JV Amount"
          :rules="[required]"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="4">
        <JournalStatusSelect
          v-model="journal.status"
          :rules="[required]"
        />
      </v-col>
      <v-col cols="4">
        <StringDateInput
          v-model="journal.jvDate"
          label="JV Date"
          :rules="[required]"
        />
      </v-col>
      <v-col cols="4">
        <FiscalYearSelect
          v-model="journal.fiscalYear"
          :rules="[required]"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="4">
        <v-text-field
          v-model="journal.description"
          label="Description"
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.orgDepartment"
          label="Org Department"
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.odCompletedBy"
          label="OD Completed By"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="journal.explanation"
          label="Explanation"
        />
      </v-col>
    </v-row>

    <v-divider class="mb-5" />

    <v-row>
      <v-col cols="4">
        <DepartmentSelectString
          v-model="journal.department"
          :rules="[required]"
        />
      </v-col>
    </v-row>

    <h3 class="mb-3">Recoveries</h3>

    <p
      v-if="isNil(journal.department)"
      class="mb-3"
    >
      Please select a department before picking recoveries
    </p>

    <RecoveriesSearchableAutocomplete
      v-model="recoveryIds"
      :disabled="isNil(journal.department)"
      :where="{ department: journal.department }"
    />

    <v-divider class="my-5" />
    <v-btn
      type="submit"
      :loading="isCreating"
      :disabled="isCreating"
      text="Create Journal"
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { isNil } from "lodash"
import { VForm } from "vuetify/components"

import { required } from "@/utils/validators"

import journalApi, { Journal } from "@/api/journals-api"

import useSnack from "@/use/use-snack"

import StringDateInput from "@/components/common/StringDateInput.vue"
import FiscalYearSelect from "@/components/common/FiscalYearSelect.vue"
import DepartmentSelectString from "@/components/departments/DepartmentSelectString.vue"
import RecoveriesSearchableAutocomplete from "@/components/recoveries/RecoveriesSearchableAutocomplete.vue"
import JournalStatusSelect from "@/components/journals/JournalStatusSelect.vue"

const emit = defineEmits<{ created: [journalId: number] }>()

const journal = ref<Partial<Journal>>({})
const recoveryIds = ref<number[]>([])

const isCreating = ref(false)
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const snack = useSnack()

async function validateAndCreate() {
  if (formRef.value === null) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    isCreating.value = true
    const data = await journalApi.create({ ...journal.value }, recoveryIds.value)
    emit("created", data.journal.journalID)
    close()
    snack.success("Journal created")
  } catch (error) {
    console.log(error)
    snack.error("Failed to create journal")
  } finally {
    journal.value = {}
    isCreating.value = false
  }
}
</script>
