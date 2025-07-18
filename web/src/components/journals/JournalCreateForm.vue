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
        <v-text-field
          v-model="journal.status"
          label="Status"
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
      <v-col cols="4">
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          variant="outlined"
          text="Refresh Recoveries"
          @click="refreshRecoveriesList"
        />
      </v-col>
    </v-row>

    <h3 class="mb-3">Recoveries</h3>

    <div v-if="totalRecoveries > 0">
      <v-list>
        <v-list-item>
          <v-row>
            <v-col cols="2"> Fiscal Year </v-col>
            <v-col cols="2"> Supplier </v-col>
            <v-col cols="4"> Branch </v-col>
            <v-col cols="2"> Total Price </v-col>
            <v-col cols="1"></v-col>
          </v-row>
        </v-list-item>
        <div
          v-for="(recovery, index) of recoveries"
          :key="index"
        >
          <v-list-item>
            <v-row>
              <v-col cols="2">
                <v-text-field
                  v-model="recovery.fiscal_year"
                  class="pt-2"
                  density="compact"
                  hide-details
                  readonly
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  v-model="recovery.supplier"
                  class="pt-2"
                  density="compact"
                  hide-details
                  readonly
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="recovery.branch"
                  class="pt-2"
                  density="compact"
                  hide-details
                  readonly
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  :model-value="formatCurrency(recovery.totalPrice)"
                  density="compact"
                  hide-details
                  readonly
                />
              </v-col>
              <v-col cols="1">
                <v-btn
                  class="mt-1"
                  icon="mdi-delete"
                  size="x-small"
                  color="error"
                  @click="removeRecoveryAt(index)"
                />
              </v-col>
            </v-row>
          </v-list-item>
        </div>
      </v-list>
    </div>
    <div v-else>No recoveries found</div>

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
import { computed, ref } from "vue"
import { isNil } from "lodash"
import { VForm } from "vuetify/components"

import { required } from "@/utils/validators"
import formatCurrency from "@/utils/format-currency"

import journalApi, { Journal } from "@/api/journals-api"

import useSnack from "@/use/use-snack"
import useRecoveries, { type RecoveryWhereOptions } from "@/use/use-recoveries"

import StringDateInput from "@/components/common/StringDateInput.vue"
import FiscalYearSelect from "@/components/common/FiscalYearSelect.vue"
import DepartmentSelectString from "@/components/departments/DepartmentSelectString.vue"

const emit = defineEmits<{ created: [journalId: number] }>()

const journal = ref<Partial<Journal>>({})

const isCreating = ref(false)
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const snack = useSnack()

const recoveriesWhereOptions = computed<RecoveryWhereOptions>(() => {
  if (isNil(journal.value.department)) return {}

  return {
    department: journal.value.department,
  }
})

const recoveriesQueryOptions = computed(() => ({
  where: recoveriesWhereOptions.value,
}))

const {
  recoveries,
  totalCount: totalRecoveries,
  refresh: refreshRecoveries,
} = useRecoveries(recoveriesQueryOptions, {
  skipWatchIf: () => isNil(journal.value.department),
})

function refreshRecoveriesList() {
  if (isNil(journal.value.department)) return
  refreshRecoveries()
}

function removeRecoveryAt(index: number) {
  recoveries.value.splice(index, 1)
}

async function validateAndCreate() {
  if (formRef.value === null) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    isCreating.value = true

    const recoveryIds = recoveries.value.map((recovery) => recovery.recoveryID)
    const data = await journalApi.create({ ...journal.value }, recoveryIds)

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
