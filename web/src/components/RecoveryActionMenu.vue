<template>
  <ConfirmButton
    v-if="canRouteForApproval"
    button-text="Route for Approval"
    button-size="large"
    button-color="primary"
    button-variant="flat"
    confirm-title="Route for Approval?"
    :extra-text="`This will send an email to ${recovery?.requastorEmail} and they will be asked to approve or reject this recovery. Are you sure you would like to continue?`"
    confirm-button-text="Yes, continue"
    confirm-variant="primary"
    @on-confirm="routeForApprovalClick"
  >
  </ConfirmButton>

  <ConfirmButton
    v-if="canComplete"
    button-text="Mark Completed"
    button-size="large"
    button-color="primary"
    button-variant="flat"
    confirm-title="Mark Completed?"
    :extra-text="`This will complete the recovery process and send to ICT Finance for processing. Are you sure you would like to continue?`"
    confirm-button-text="Yes, continue"
    confirm-variant="primary"
    @on-confirm="completeClick"
  >
  </ConfirmButton>

  <div v-if="canApprove">
    <ConfirmButton
      button-text="Approve Recovery"
      button-size="large"
      button-color="primary"
      button-variant="flat"
      confirm-title="Approve Recovery?"
      :extra-text="`This will send an email to ${recovery?.createUser} and they will be able to fulfill this request. Are you sure you would like to continue?`"
      confirm-button-text="Yes, continue"
      confirm-variant="primary"
      @on-confirm="approveClick"
    >
    </ConfirmButton>
    &nbsp;

    <RecoveryRejectDialog
      button-text="Reject Recovery"
      button-size="default"
      button-color="warning"
      button-variant="outlined"
      confirm-title="Reject Recovery?"
      :extra-text="`This will send an email to ${recovery?.createUser} and they will be asked to approve or reject this recovery. Are you sure you would like to continue?`"
      confirm-button-text="Reject"
      confirm-variant="warning"
      @on-confirm="rejectClick"
    />
  </div>

  <v-menu
    width="400"
    offset-y
    location="bottom end"
    :close-on-content-click="false"
    :scrim="true"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="tonal"
        size="small"
        class="ml-4 border"
        icon="mdi-chevron-down"
      >
      </v-btn>
    </template>
    <v-card>
      <v-card-text>
        <h2 class="mb-2">Recovery Actions</h2>
        <p>
          The actions available in this menu depend on your role and the current status of the
          request.
        </p>

        <v-list> </v-list>
        <ConfirmButton
          v-if="canDelete"
          button-class=""
          button-color="error"
          button-size="default"
          button-text="Delete Recovery"
          button-variant="outlined"
          confirm-button-text="Yes, Delete"
          confirm-text="Do you want to delete this recovery?"
          confirm-title="Delete Recovery"
          confirm-variant="error"
          extra-text="This action cannot be undone."
          @on-confirm="deleteClick"
        />
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import ConfirmButton from "@/components/common/ConfirmButton.vue"
import recoveriesApi from "@/api/recoveries-api"
import useSnack from "@/use/use-snack"
import useRecovery from "@/use/use-recovery"
import useCurrentUser from "@/use/use-current-user"
import { isNil } from "lodash"
import RecoveryRejectDialog from "./recoveries/RecoveryRejectDialog.vue"

const snack = useSnack()
const router = useRouter()
const { currentUser, isSystemAdmin } = useCurrentUser()

const emit = defineEmits(["reload"])
const props = defineProps({
  recoveryId: {
    type: Number,
    required: true,
  },
})

const canRouteForApproval = computed(() => {
  if (isNil(currentUser.value)) return false

  return (
    (isSystemAdmin.value || currentUser.value?.email == recovery.value?.createUser) &&
    (recovery.value?.status == "Draft" || recovery.value?.status == "Re-Draft")
  )
})

const canComplete = computed(() => {
  if (isNil(currentUser.value)) return false

  return (
    (isSystemAdmin.value || currentUser.value?.email == recovery.value?.createUser) &&
    recovery.value?.status == "Fulfilled"
  )
})

const canApprove = computed(() => {
  if (isNil(currentUser.value)) return false

  if (
    currentUser.value.email == recovery.value?.requastorEmail &&
    recovery.value?.status == "Routed For Approval"
  )
    return true

  return (
    (isSystemAdmin.value || currentUser.value.email == recovery.value?.requastorEmail) &&
    recovery.value?.status == "Routed For Approval"
  )
})

const canDelete = computed(() => {
  return (
    (isSystemAdmin.value || currentUser.value?.email == recovery.value?.createUser) &&
    recovery.value?.status == "Draft"
  )
})

const { recovery, save, fetch } = useRecovery(ref(props.recoveryId))
defineExpose({ fetch })

async function routeForApprovalClick() {
  if (!recovery.value) return

  recovery.value.status = "Routed For Approval"
  recovery.value.action = "Routed For Approval"
  recovery.value.reasonForDecline = ""
  await save()
  await fetch()
  emit("reload")
  snack.success("Recovery routed for approval")
}

async function approveClick() {
  if (!recovery.value) return

  recovery.value.status = "Purchase Approved"
  recovery.value.action = "Purchase Approved"
  await save()
  await fetch()
  emit("reload")
  snack.success("Recovery approved")
}

async function rejectClick(reason: string) {
  if (!recovery.value) return

  recovery.value.status = "Draft"
  recovery.value.action = `Request Declined (${reason.slice(0, 25)}...)`
  recovery.value.reasonForDecline = reason
  await save()
  await fetch()
  emit("reload")
  snack.success("Recovery rejected")
}

async function completeClick() {
  if (!recovery.value) return

  recovery.value.status = "Complete"
  recovery.value.action = "Completed Request"
  await save()
  await fetch()
  emit("reload")
  snack.success("Recovery completed")
}

async function deleteClick() {
  recoveriesApi.delete(props.recoveryId).then(() => {
    snack.success("Recovery deleted")
    router.push({ name: "DashboardPage" })
  })
}

function getActionType(status: string) {
  const reasonForDecline = ref("")

  if (status == "Routed For Approval") return "Routed For Approval"
  if (status == "Re-Draft") return `Request Declined (${reasonForDecline.value.slice(0, 25)}...)`
  if (status == "Purchase Approved") return "Purchase Approved"
  if (status == "Partially Fulfilled") return "Partially Filled Items"
  if (status == "Fulfilled") return "Filled Items"
  if (status == "Complete") return "Completed Request"
  return "Updated Request"
}
</script>
