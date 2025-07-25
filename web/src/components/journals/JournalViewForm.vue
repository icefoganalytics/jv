<template>
  <v-skeleton-loader
    v-if="isNil(journal)"
    type="card"
  />
  <v-form v-else>
    <v-row>
      <v-col cols="4">
        <v-text-field
          v-model="journal.jvNum"
          label="JV Number"
          readonly
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.period"
          label="Period"
          readonly
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.jvAmount"
          label="JV Amount"
          readonly
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="4">
        <v-text-field
          v-model="journal.status"
          label="Status"
          readonly
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.jvDate"
          label="JV Date"
          readonly
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.fiscalYear"
          label="Fiscal Year"
          readonly
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="4">
        <v-text-field
          v-model="journal.description"
          label="Description"
          readonly
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.orgDepartment"
          label="Org Department"
          readonly
        />
      </v-col>
      <v-col cols="4">
        <v-text-field
          v-model="journal.odCompletedBy"
          label="OD Completed By"
          readonly
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="journal.explanation"
          label="Explanation"
          readonly
        />
      </v-col>
    </v-row>

    <v-divider class="mb-5" />

    <v-row>
      <v-col cols="4">
        <v-text-field
          v-model="journal.department"
          label="Department"
          readonly
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
            </v-row>
          </v-list-item>
        </div>
        <v-list-item style="background-color: #ddd">
          <v-row>
            <v-col
              cols="8"
              style="font-weight: bold; font-size: 1.1rem"
            >
              Total
            </v-col>
            <v-col
              cols="4"
              class="pl-9"
              style="font-weight: bold; font-size: 1.1rem"
              >{{ formatCurrency(itemTotalCost) }}
            </v-col>
          </v-row>
        </v-list-item>
      </v-list>
    </div>
    <div v-else>No recoveries found</div>

    <v-divider class="my-5" />
  </v-form>
</template>

<script lang="ts" setup>
import { isNil, isNumber } from "lodash"
import { computed, toRefs } from "vue"

import formatCurrency from "@/utils/format-currency"

import useJournal from "@/use/use-journal"
import useRecoveries, { type RecoveryWhereOptions } from "@/use/use-recoveries"

const props = defineProps<{ journalId: number }>()
const { journalId } = toRefs(props)

const { journal } = useJournal(journalId)

const recoveriesWhereOptions = computed<RecoveryWhereOptions>(() => {
  if (isNil(journal.value)) return {}

  return {
    journalID: journal.value.journalID,
  }
})

const recoveriesQueryOptions = computed(() => ({
  where: recoveriesWhereOptions.value,
}))

const { recoveries, totalCount: totalRecoveries } = useRecoveries(recoveriesQueryOptions, {
  skipWatchIf: () => isNil(journal.value),
})

const itemTotalCost = computed(() => {
  if (recoveries.value?.length > 0) {
    return recoveries.value.reduce(
      (acc, item) => acc + (isNumber(item.totalPrice) ? item.totalPrice : 0),
      0
    )
  }

  return 0
})
</script>
