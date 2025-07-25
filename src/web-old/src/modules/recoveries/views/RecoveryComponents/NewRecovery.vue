<template>
  <v-dialog
    v-model="addNewRecoveryDialog"
    persistent
    :max-width="maxWidth"
    scrollable
  >
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        :elevation="type == 'Add New' ? '5' : '0'"
        :color="type == 'Add New' || type == 'Approve' ? 'primary' : 'transparent'"
        @click="initForm()"
        v-bind="attrs"
        v-on="on"
      >
        <div v-if="type == 'Add New'">Create New Recovery</div>
        <div v-else-if="type == 'Approve'">Review</div>

        <v-tooltip
          v-else-if="type == 'Complete' && btnTxt && noGlCode"
          right
          color="warning"
        >
          <template #activator="{ on }">
            <div class="primary--text">{{ btnTxt }}</div>
            <v-icon
              color="warning"
              class="mr-1"
              v-on="on"
              >mdi-alert</v-icon
            >
          </template>
          <span>No GlCode</span>
        </v-tooltip>
        <div
          v-else-if="type == 'Complete' && btnTxt"
          class="primary--text"
        >
          {{ btnTxt }}
        </div>

        <v-tooltip
          v-else-if="type == 'Complete' && !btnTxt && noGlCode"
          left
          color="warning"
        >
          <template #activator="{ on }">
            <v-icon
              color="warning"
              class="mr-1"
              v-on="on"
              >mdi-alert</v-icon
            >
          </template>
          <span>No GlCode</span>
        </v-tooltip>
        <v-icon
          v-else-if="type == 'Complete' && !btnTxt"
          dense
          color="primary"
          >mdi-magnify</v-icon
        >

        <v-icon
          v-else
          dense
          color="primary"
          >mdi-pencil</v-icon
        >
      </v-btn>
    </template>

    <v-card
      :loading="loadingData"
      :disabled="loadingData"
    >
      <v-card-title
        class="primary"
        style="border-bottom: 1px solid black"
      >
        <div
          class="text-h5"
          style="color: white"
        >
          {{ title }} Recovery
        </div>
        <v-spacer />
        <v-btn
          fab
          small
          elevation="0"
          color="primary"
          class="my-0"
          @click="closeDialog"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row class="mt-5">
          <v-col cols="4">
            <v-autocomplete
              :readonly="readonly"
              @change="
                state.employeeNameErr = false
                employeeChanged()
              "
              :error="state.employeeNameErr"
              :items="employeeList"
              item-text="fullName"
              item-value="fullName"
              v-model="employeeName"
              label="Requestor Name"
              outlined
              dense
            />
          </v-col>
          <v-col cols="3">
            <v-text-field
              :readonly="readonly"
              :error="state.employeeMailCdErr"
              @input="state.employeeMailCdErr = false"
              v-model="employeeMailCd"
              label="Requestor Mail Code"
              outlined
              dense
              :clearable="!readonly"
            />
          </v-col>
          <v-col cols="5">
            <v-text-field
              :readonly="readonly"
              :error="state.requastorEmailErr"
              @input="state.requastorEmailErr = false"
              v-model="requastorEmail"
              label="Requestor EMail"
              outlined
              dense
              :clearable="!readonly"
            />
          </v-col>
        </v-row>

        <v-row class="mt-0">
          <v-col cols="4">
            <v-select
              :readonly="readonly"
              :error="state.departmentErr"
              @change="
                state.departmentErr = false
                departmentChanged()
              "
              v-model="department"
              :items="departmentList"
              item-text="name"
              label="Requestor Department"
              outlined
              dense
            />
          </v-col>
          <v-col cols="4">
            <v-select
              :readonly="readonly"
              :error="state.employeeBranchErr"
              @change="
                state.employeeBranchErr = false
                branchChanged()
              "
              v-model="employeeBranch"
              :items="branchList"
              item-text="name"
              label="Requestor Branch"
              outlined
              dense
            />
          </v-col>
          <v-col cols="4">
            <v-select
              :readonly="readonly"
              v-model="employeeUnit"
              :items="unitList"
              item-text="name"
              label="Requestor Unit"
              outlined
              dense
            />
          </v-col>
        </v-row>

        <v-row class="mt-0">
          <v-col cols="3">
            <v-text-field
              readonly
              v-model="recoveryID"
              label="Recovery ID"
              outlined
              dense
            />
          </v-col>
          <v-col cols="3">
            <v-text-field
              :readonly="readonly"
              :error="state.refNumErr"
              @input="state.refNumErr = false"
              v-model="refNum"
              label="Reference"
              persistent-hint
              hint="Incident #, Project #"
              outlined
              dense
              :clearable="!readonly"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              :readonly="readonly && !userView"
              v-model="requestDescription"
              label="Request Description"
              outlined
              dense
            />
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <v-card outlined>
              <v-data-table
                :headers="itemHeaders"
                :items="recoveryItems"
                hide-default-footer
              >
                <template v-slot:[`item.itemCategory`]="{ item }">
                  <v-autocomplete
                    dense
                    hide-details
                    :error="item.state.itemCategoryErr"
                    @change="
                      item.state.itemCategoryErr = false
                      itemCategoryChanged(item)
                    "
                    :readonly="readonly"
                    :items="itemCategoryList"
                    v-model="item.itemCatID"
                    solo
                  />
                </template>
                <template v-slot:[`item.description`]="{ item }">
                  <v-text-field
                    dense
                    :error="item.state.descriptionErr"
                    @input="item.state.descriptionErr = false"
                    hide-details
                    :readonly="readonly"
                    v-model="item.description"
                    solo
                  />
                </template>
                <template v-slot:[`item.changeQuantity`]="{ item }">
                  <div class="mx-auto d-flex justify-center">
                    <v-checkbox
                      :readonly="readonly"
                      class="mt-n1"
                      hide-details
                      solo
                      v-model="item.changeQuantity"
                    />
                  </div>
                </template>
                <template v-slot:[`item.quantity`]="{ item }">
                  <v-text-field
                    :background-color="item.changeQuantity && userView ? '#E8F5E9' : '#FFF'"
                    dense
                    hide-details
                    :readonly="
                      type == 'Fill' || type == 'Complete' || (!item.changeQuantity && userView)
                    "
                    :error="item.state.quantityErr"
                    @input="
                      item.state.quantityErr = false
                      calculateTotalPrice()
                    "
                    v-model="item.quantity"
                    solo
                  />
                </template>
                <template v-slot:[`item.unitPrice`]="{ item }">
                  <v-text-field
                    :background-color="type == 'Fill' ? '#E8F5E9' : '#FFF'"
                    dense
                    hide-details
                    :error="item.state.unitPriceErr"
                    @input="
                      item.state.unitPriceErr = false
                      calculateTotalPrice(true)
                    "
                    @change="
                      item.state.unitPriceErr = false
                      calculateTotalPrice()
                    "
                    :readonly="readonly && type != 'Fill'"
                    v-model="item.unitPrice"
                    prefix="$"
                    solo
                  />
                </template>
                <template v-slot:[`item.totalPrice`]="{ item }">
                  <v-text-field
                    dense
                    solo
                    hide-details
                    readonly
                    v-model="item.totalPrice"
                    prefix="$"
                  />
                </template>

                <template v-slot:[`item.revisedCost`]="{ item }">
                  <v-text-field
                    dense
                    solo
                    hide-details
                    readonly
                    v-model="item.revisedCost"
                    prefix="$"
                  />
                </template>

                <template v-slot:[`item.approvedCost`]="{ item }">
                  <v-text-field
                    dense
                    solo
                    hide-details
                    :error="item.state.approvedCostErr"
                    readonly
                    v-model="item.approvedCost"
                    prefix="$"
                  />
                </template>

                <template v-slot:[`item.clientChange`]="{ item }">
                  <v-text-field
                    dense
                    hide-details
                    :error="item.state.clientChangeErr"
                    @input="item.state.clientChangeErr = false"
                    :readonly="type != 'Approve'"
                    v-model="item.clientChange"
                    solo
                  />
                </template>

                <template v-slot:[`item.orderFilled`]="{ item }">
                  <div class="d-flex justify-center">
                    <v-checkbox
                      :class="type == 'Fill' ? 'mt-n1 mr-n2 bg-success' : 'mt-n1 mr-n2'"
                      @change="fillOrderChanged(item)"
                      :readonly="type == 'Complete'"
                      hide-details
                      v-model="item.orderFilled"
                      solo
                    />
                  </div>
                </template>

                <template v-slot:[`item.filledBy`]="{ item }">
                  <v-text-field
                    dense
                    readonly
                    hide-details
                    v-model="item.filledBy"
                    solo
                  />
                </template>

                <template v-slot:[`item.remove`]="{ item }">
                  <v-btn
                    v-if="!readonly"
                    @click="removeItem(item)"
                    style="min-width: 0"
                    color="transparent"
                    class="px-0 mt-0"
                    small
                  >
                    <v-icon
                      class=""
                      color="red"
                      >mdi-delete</v-icon
                    >
                  </v-btn>
                </template>

                <template v-slot:footer>
                  <v-row
                    class="my-2 pb-2 mx-0"
                    style="font-weight: 600; font-size: 13pt"
                  >
                    <v-btn
                      v-if="!readonly"
                      class="ml-2"
                      color="primary"
                      :loading="savingData"
                      @click="addRecoveryItem()"
                      small
                      >Add Item
                    </v-btn>

                    <div class="ml-auto mr-12">TOTAL</div>
                    <div style="width: 160px">$ {{ total.toFixed(2) | currency }}</div>
                  </v-row>
                </template>
                <template v-slot:no-data>
                  <div :class="state.recoveryItemsErr ? 'red white--text' : ''">
                    No data available
                  </div>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="recovery.status == 'Re-Draft'">
          <v-row class="mt-2 text-h6 mx-3 brown--text text--darken-2">
            The Request declined by the Approver because:
          </v-row>
          <v-row class="mt-n5 mx-3">
            <v-textarea
              background-color="#FFE9C3"
              readonly
              class="mt-5 text-warning"
              outlined
              :rules="rules"
              :rows="3"
              v-model="reasonForDecline"
            />
          </v-row>
        </div>

        <v-row class="my-3">
          <v-col cols="6">
            <title-card titleWidth="5rem">
              <template #title>
                <div>Back-up</div>
              </template>
              <template #body>
                <div
                  style="overflow-y: scroll"
                  :style="{ height: uploadBtn || admin ? '140px' : '200px' }"
                >
                  <div :key="update">
                    <v-list dense>
                      <v-list-item
                        v-for="(doc, inx) in recovery.docName"
                        :key="'recovery-' + inx"
                        @click="downloadDocument(doc)"
                      >
                        <v-list-item-content>
                          <v-list-item-title>{{ doc.docName }}</v-list-item-title>
                          <v-list-item-subtitle>{{
                            doc.itemCatName ?? "Manual upload"
                          }}</v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-icon
                          v-if="(doc.documentID && uploadBtn) || admin"
                          @click.stop="deleteDocument(doc)"
                        >
                          <v-icon color="red">mdi-delete</v-icon>
                        </v-list-item-icon>
                      </v-list-item>
                    </v-list>
                  </div>
                </div>

                <v-btn
                  v-if="uploadBtn || admin"
                  :loading="savingData"
                  class="ml-4 my-4"
                  color="primary"
                  elevation="5"
                  small
                  @click="uploadDocument"
                >
                  Upload Back-up
                  <input
                    id="inputfile"
                    type="file"
                    style="display: none"
                    accept="application/pdf"
                    @change="handleSelectedFile"
                    onclick="this.value=null;"
                  />
                </v-btn>
              </template>
            </title-card>
          </v-col>
          <v-col
            cols="6"
            class="mx-0"
          >
            <title-card
              class="mr-6"
              titleWidth="7rem"
            >
              <template #title>
                <div>Audit history</div>
              </template>
              <template #body>
                <div style="height: 200px; overflow-y: scroll">
                  <v-list dense>
                    <v-list-item
                      v-for="item of recoveryAudits"
                      :key="item.auditID"
                    >
                      <v-list-item-content>
                        <v-list-item-title>{{ item.action }}</v-list-item-title>
                        <v-list-item-subtitle
                          >{{ formatDate(item.date) }} by {{ item.user }}</v-list-item-subtitle
                        >
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </div>
              </template>
            </title-card>
          </v-col>
        </v-row>

        <v-divider class="mb-3" />

        <v-row>
          <v-col cols="12">
            <div v-if="routeForApprovalBtn">
              <v-btn
                :loading="savingData"
                class="ml-auto mr-5 my-0"
                color="primary"
                elevation="5"
                @click="saveNewRecovery('Routed For Approval')"
              >
                Route For Approval
              </v-btn>
            </div>
            <div
              v-else-if="revertBtn || approveBtn"
              class="d-flex"
            >
              <v-btn
                v-if="revertBtn"
                :loading="savingData"
                color="warning"
                @click="declineDialog = true"
              >
                Decline Request
              </v-btn>

              <v-spacer />

              <div
                v-if="approveBtn"
                style="max-width: 50%; text-align: right"
              >
                <v-btn
                  color="primary"
                  :loading="savingData"
                  @click="saveNewRecovery('Purchase Approved')"
                >
                  Approve Purchase
                </v-btn>
                <div class="mt-1 mb-n15">
                  By selecting Approve you have been provided approval by those individuals with
                  Section 29 (commitment authority)
                </div>
              </div>
            </div>

            <v-btn
              v-if="saveBtn"
              class="ml-auto mr-5 my-auto"
              color="primary"
              elevation="5"
              @click="saveNewRecovery(completeBtn ? 'Fullfilled' : 'Partially Fullfilled')"
            >
              Save Changes
            </v-btn>
          </v-col>
        </v-row>

        <v-row v-if="glCodeEnable">
          <v-col cols="6" />
          <v-col cols="6">
            <div class="mb-5">
              <b class="text-h6">GL Code: </b>
              <span
                v-if="recovery.glCode"
                class="text-h6"
                >{{ recovery.glCode }}</span
              >
              <span
                v-else
                class="red--text text-h6"
                >No GLcode Saved!</span
              >
            </div>
            <v-select
              v-model="glCode"
              :items="glCodeList"
              item-value="glcode"
              label="GL Coding"
              outlined
            >
              <template v-slot:selection="{ item }">
                {{ item.glcode }}
              </template>
              <template v-slot:item="{ item }">
                <v-row>
                  <v-col>
                    <div style="font-size: 14pt">
                      <b class="primary--text">
                        {{
                          item.glcode
                            ?.replace("-", " ")
                            .replace("-", " ")
                            .replace("-", " ")
                            .replace("-", " ")
                        }}
                      </b>
                    </div>
                    <div
                      v-if="item.recvDepartment"
                      style="font-size: 11pt"
                    >
                      Receiving: {{ item.recvDepartment }}
                    </div>
                    <div
                      v-if="item.department"
                      class="red--text"
                    >
                      {{ item.department }}
                    </div>
                    <div style="font-size: 11pt">{{ item.ictBranch }}</div>
                    <div style="font-size: 10pt">{{ item.ictUnit }}</div>
                    <hr />
                  </v-col>
                </v-row>
              </template>
            </v-select>
            <v-btn
              class="float-right"
              :disabled="!Boolean(glCode)"
              color="primary"
              :loading="savingData"
              @click="saveGlCode()"
              >Save GlCode
            </v-btn>
          </v-col>
        </v-row>

        <v-row
          v-if="alert"
          class="mt-15 mx-3"
        >
          <v-alert
            v-model="alert"
            dense
            color="red darken-4"
            dark
            dismissible
          >
            {{ alertMsg }}
          </v-alert>
        </v-row>
      </v-card-text>

      <v-card-actions class="mt-0 mb-3">
        <v-btn
          color="white"
          class="ml-5 cyan--text text--darken-4"
          @click="closeDialog"
        >
          <div
            v-if="readonly"
            class="px-3"
          >
            Close
          </div>
          <div v-else>Cancel</div>
        </v-btn>
        <v-btn
          v-if="!readonly"
          class="ml-auto mr-5 px-5 white--text"
          color="#005a65"
          @click="saveNewRecovery('Draft')"
          :loading="savingData"
          >Save
        </v-btn>
        <v-btn
          v-if="saveBtn && completeBtn && supervisor"
          class="ml-auto mr-5 px-5 white--text"
          color="#005a65"
          @click="saveNewRecovery('Complete')"
        >
          Complete Recoverable
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog
      v-model="declineDialog"
      persistent
      max-width="30%"
    >
      <v-card>
        <v-card-title class="warning white--text">
          <b class="text-h5">Decline Request</b>
        </v-card-title>
        <v-card-text>
          <v-textarea
            class="mt-5"
            label="Reason For Decline "
            outlined
            :rules="rules"
            :rows="5"
            v-model="reasonForDecline"
          />
        </v-card-text>
        <v-card-actions class="mt-n5 mb-3">
          <v-btn
            color="white"
            class="ml-5 cyan--text text--darken-4"
            @click="declineDialog = false"
          >
            Cancel
          </v-btn>

          <v-btn
            :disabled="!reasonForDecline || (reasonForDecline && reasonForDecline.length < 1)"
            class="ml-auto mr-5 px-5 white--text"
            color="#005a65"
            @click="
              declineDialog = false
              saveNewRecovery('Re-Draft')
            "
            :loading="savingData"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
import Vue from "vue"
import { RECOVERIES_URL, ADMIN_URL, USERS_URL } from "@/urls"
import axios from "axios"
import moment from "moment"
import TitleCard from "../Common/TitleCard.vue"
import { mapGetters } from "vuex"

export default {
  components: {
    TitleCard,
  },
  name: "NewRecovery",
  props: {
    type: { type: String },
    title: { type: String },
    recovery: {},
    maxWidth: {},
    btnTxt: { type: String, required: false },
    noGlCode: { type: Boolean, default: false },
    editGlCode: { type: Boolean, default: false },
  },
  data() {
    return {
      itemHeaders: [],
      itemHeadersWidth: [],

      auditHeaders: [
        {
          text: "Date",
          value: "date",
          class: "grey lighten-4",
          cellClass: "px-1 py-1",
          width: "20%",
        },
        {
          text: "Action",
          value: "action",
          class: "grey lighten-4",
          cellClass: "px-1 py-1",
          width: "40%",
        },
        {
          text: "User",
          value: "user",
          class: "grey lighten-4",
          cellClass: "px-1 py-1",
          width: "40%",
        },
      ],

      rules: [(v) => v?.length <= 255 || "Max 255 characters"],

      admin: false,
      addNewRecoveryDialog: false,
      declineDialog: false,

      department: "",
      employeeName: "",
      requastorEmail: "",
      employeeBranch: "",
      employeeUnit: "",
      employeeMailCd: "",
      requestDescription: "",
      reasonForDecline: "",
      refNum: "",
      glCode: "",
      recoveryID: "",
      recoveryItems: [],

      recoveryAudits: [],
      allDepartments: {},
      departmentList: [],
      branchList: [],
      unitList: [],
      employeeList: [],
      itemCategoryList: [],
      itemCategoryListAll: [],

      allUploadingDocuments: [],
      toUpload: [],

      glCodeList: [],

      loadingData: false,
      savingData: false,
      readonly: false,
      tmpId: 0,

      revertBtn: false,
      approveBtn: false,
      saveBtn: false,
      uploadBtn: false,
      completeBtn: false,
      supervisor: false,
      glCodeEnable: false,

      userView: false,
      routeForApprovalBtn: false,

      total: 0,

      reader: new FileReader(),
      // quoteFileName: "",
      // quoteFileType: "",
      update: 0,
      alert: false,
      alertMsg: "",

      state: {
        employeeNameErr: false,
        requastorEmailErr: false,
        refNumErr: false,
        departmentErr: false,
        recoveryItemsErr: false,
      },
    }
  },
  mounted() {},
  ...mapGetters(["isSystemAdmin", "isICTFinance"]),

  methods: {
    isReadOnly() {
      return this.type != "Add New" && this.type != "Edit"
    },

    formatDate(input) {
      if (!input) return ""
      return moment(input).format("YYYY-MM-DD @ h:mma")
    },

    async initForm() {
      this.loadingData = true
      this.admin = this.isSystemAdmin
      //this.supervisor =this.isBranchAdmin;
      this.readonly = this.isReadOnly()
      this.approveBtn = this.type == "Approve"
      this.revertBtn = this.type == "Approve"
      this.saveBtn = this.type == "Fill"
      this.uploadBtn = this.type != "Approve" && this.type != "Complete"
      this.glCodeEnable = this.type == "Complete" && this.isICTFinance && this.editGlCode
      this.alert = false
      this.userView = this.type == "Approve"
      this.routeForApprovalBtn = !this.readonly

      if (this.type == "Complete") await this.loadRecovery()

      this.initItemHeader()
      this.initStates()
      this.initEmployees()
      this.initDepartments()
      this.initItemCategory()
      if (this.type == "Add New") {
        this.department = ""
        this.employeeName = ""
        this.requastorEmail = ""
        this.employeeBranch = ""
        this.employeeUnit = ""
        this.employeeMailCd = ""
        this.reasonForDecline = ""
        this.refNum = ""
        this.glCode = ""
        this.requestDescription = ""
        this.recoveryID = ""
        this.recoveryItems = []
        this.recoveryAudits = []
      } else {
        this.department = this.recovery.department
        this.departmentChanged()
        this.employeeName = this.recovery.firstName + "." + this.recovery.lastName
        this.requastorEmail = this.recovery.requastorEmail
        Vue.nextTick(() => {
          this.employeeBranch = this.recovery.employeeBranch
          this.employeeUnit = this.recovery.employeeUnit
          this.branchChanged()
        })
        this.employeeMailCd = this.recovery.mailcode
        this.refNum = this.recovery.refNum
        this.glCode = this.recovery.glCode
        this.requestDescription = this.recovery.description
        this.reasonForDecline = this.recovery.reasonForDecline
        this.recoveryID = this.recovery?.recoveryID ? this.recovery.recoveryID : ""
        this.recoveryItems = this.recovery.recoveryItems
        this.recoveryAudits = this.recovery.recoveryAudits.sort((a, b) => {
          return a.date > b.date ? -1 : 1
        })
        this.calculateTotalPrice()
      }

      if (this.glCodeEnable) await this.initGlCode()

      this.savingData = false
      if (this.type == "Fill") {
        this.recoveryItems.forEach((item) => {
          if (!item.quantity) item.orderFilled = true
        })
      }
      if (this.type == "Approve") {
        this.recoveryItems.forEach((item) => {
          item.category = this.itemCategoryListAll.filter(
            (cat) => cat.value == item.itemCatID
          )[0].text
          item.originalQuantity = item.quantity
        })
      }
      this.checkOrderCompleted()
      this.loadingData = false
      this.allUploadingDocuments = []
      this.update++
    },

    initItemHeader() {
      const item = {
        text: "Item",
        value: "itemCategory",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const desc = {
        text: "Description",
        value: "description",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const chxqnt = {
        text: "Can Change Quantity",
        value: "changeQuantity",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const qnt = {
        text: "Quantity",
        value: "quantity",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const price = {
        text: "Unit Price",
        value: "unitPrice",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const cost = {
        text: "Cost",
        value: "totalPrice",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const rvCost = {
        text: "Revised Cost",
        value: "revisedCost",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const apCost = {
        text: "Approved Cost",
        value: "approvedCost",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const fill = {
        text: "Filled",
        value: "orderFilled",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const fillBy = {
        text: "Filled By",
        value: "filledBy",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const change = {
        text: "Client Change",
        value: "clientChange",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }
      const remove = {
        text: "",
        value: "remove",
        class: "blue-grey lighten-4",
        cellClass: "px-1 py-1",
        sortable: false,
      }

      this.itemHeaders = []
      if (this.type == "Add New" || this.type == "Edit") {
        this.itemHeadersWidth = [19, 28, 9, 14, 12, 15, 3]
        this.itemHeaders.push(item, desc, qnt, chxqnt, price, cost, remove)
      }
      if (this.type == "Approve") {
        this.itemHeadersWidth = [13, 25, 8, 10, 12, 12, 20]
        this.itemHeaders.push(item, desc, qnt, price, cost, rvCost, change)
      }
      if (this.type == "Fill" || this.type == "Complete") {
        this.itemHeadersWidth = [11, 15, 7, 9, 9, 9, 9, 4, 14, 13]
        this.itemHeaders.push(item, desc, qnt, price, cost, rvCost, apCost, fill, fillBy, change)
      }

      for (const inx in this.itemHeaders) {
        this.itemHeaders[inx]["width"] = this.itemHeadersWidth[inx] + "%"
      }
    },

    initStates() {
      for (const key of Object.keys(this.state)) {
        this.state[key] = false
      }
    },

    initEmployees() {
      this.employeeList = this.$store.state.recoveries.employees.map((item) => {
        return {
          fullName: item.fullName,
          department: item.department,
          branch: item.branch,
          mailcode: item.mailcode,
          unit: item.unit,
          email: item.email,
        } //.sort((a, b) => (a.fullName >= b.fullName ? 1 : -1));
      })
    },

    initItemCategory() {
      const activeItemCategoryList = this.readonly
        ? this.$store.state.recoveries.itemCategoryList
        : this.$store.state.recoveries.itemCategoryList.filter((item) => item.active)
      const itemCategoryList = activeItemCategoryList.map((item) => {
        return {
          text: item.category,
          value: item.itemCatID,
          price: item.price,
          branch: item.branch,
          description: item.description,
          changeQuantity: item.changeQuantity,
          docName: item.docName,
        }
      })
      this.itemCategoryListAll = itemCategoryList
      const usrBranch = this.$store.state.auth.user.branch
      if (this.admin) this.itemCategoryList = itemCategoryList
      else this.itemCategoryList = itemCategoryList.filter((cat) => cat.branch.includes(usrBranch))
    },

    initDepartments() {
      this.departmentList = []
      const depts = this.$store.state.recoveries.departmentBranch
      this.allDepartments = depts
      for (const key of Object.keys(depts)) {
        this.departmentList.push({
          name: key,
          branches: depts[key].branches,
          units: depts[key].units,
        })
      }
    },

    async initGlCode() {
      const body = { email: this.recovery.modUser }

      return axios
        .post(`${USERS_URL}/agent-glcode`, body)
        .then((resp) => {
          if (resp.data) {
            this.glCodeList = [
              ...resp.data.byDefault,
              ...resp.data.byDepartment,
              ...resp.data.byBranchUnit,
            ]
            if (!this.glCode && resp.data?.byDefault?.length > 0)
              this.glCode = resp.data.byDefault[0].glcode
          }
        })
        .catch((e) => {
          console.log(e)
          this.alertMsg = e.response ? e.response.data : "GlCode Error"
          this.alert = true
        })
    },

    async saveGlCode() {
      const body = { glCode: this.glCode }
      const id = this.recovery?.recoveryID ? this.recovery.recoveryID : 0
      return await axios
        .post(`${RECOVERIES_URL}/glcode/${id}`, body)
        .then(async (resp) => {
          this.savingData = false
          this.recovery.recoveryAudits = resp?.data?.recoveryAudits
          this.recovery.glCode = resp?.data?.glCode
          this.recoveryAudits = this.recovery.recoveryAudits.sort((a, b) => {
            return a.date > b.date ? -1 : 1
          })
          return
        })
        .catch((e) => {
          this.savingData = false
          console.log(e)
          this.alertMsg = e.response.data
          this.alert = true
        })
    },

    addRecoveryItem() {
      const recoveryItem = {
        tmpId: this.tmpId,
        itemCatID: null,
        description: "",
        changeQuantity: false,
        quantity: 0,
        unitPrice: 0,
        totalPrice: "",
        state: {
          itemCategoryErr: false,
          descriptionErr: false,
          quantityErr: false,
          unitPriceErr: false,
          approvedCostErr: false,
          clientChangeErr: false,
        },
      }
      this.tmpId++
      this.recoveryItems.push(recoveryItem)
      this.state.recoveryItemsErr = false
    },

    calculateTotalPrice(fixUnitPrice) {
      this.total = 0
      for (const item of this.recoveryItems) {
        const total = Number(item.unitPrice) * item.quantity
        if (!fixUnitPrice) item.unitPrice = Number(item.unitPrice).toFixed(2)
        if (this.type == "Add New" || this.type == "Edit") item.totalPrice = total.toFixed(2)
        else {
          item.revisedCost = total.toFixed(2)
          item.totalPrice = Number(item.totalPrice).toFixed(2)
          item.approvedCost = Number(item.approvedCost).toFixed(2)
        }

        this.total += total
      }
      this.checkTotalApproval()
    },

    itemCategoryChanged(item) {
      const category = this.itemCategoryList.filter((cat) => cat.value == item.itemCatID)[0]
      item.unitPrice = category?.price ? category.price : 0
      item.description = category?.description ? category.description : ""
      item.changeQuantity = category?.changeQuantity ? category.changeQuantity : false
      this.calculateTotalPrice()
    },

    employeeChanged() {
      if (this.employeeName) {
        const employee = this.employeeList.filter(
          (employee) => employee.fullName == this.employeeName
        )[0]
        // console.log(employee)
        this.state.departmentErr = false
        this.department = employee ? employee.department : ""
        this.departmentChanged()
        Vue.nextTick(() => {
          this.employeeUnit = employee ? employee.unit : ""
          this.employeeBranch = employee ? employee.branch : ""
          this.employeeMailCd = employee ? employee.mailcode : ""
          this.requastorEmail = employee ? employee.email : ""
        })
      }
    },

    checkTotalApproval() {
      this.routeForApprovalBtn = !this.readonly
      this.saveBtn = this.type == "Fill"

      if (this.type == "Fill")
        for (const item of this.recoveryItems) {
          const total = Number(item.unitPrice) * Number(item.quantity)
          item.state.approvedCostErr = false
          if (total > Number(item.approvedCost)) {
            item.state.approvedCostErr = true
            this.routeForApprovalBtn = true
            this.saveBtn = false
          }
        }
    },

    departmentChanged() {
      if (this.department) {
        const dept = this.departmentList.filter(
          (department) => department.name == this.department
        )[0]
        this.branchList = dept ? dept.branches : []
        // this.unitList = dept? dept.units: [];
        this.state.employeeBranchErr = false
        this.employeeBranch = ""
        this.employeeUnit = ""
        setTimeout(() => {
          this.branchChanged()
        }, 1)
      }
    },

    branchChanged() {
      if (this.department && this.employeeBranch) {
        const dept = this.allDepartments[this.department]?.branchUnits
        this.unitList = dept ? dept[this.employeeBranch] : []
      }
    },

    fillOrderChanged(item) {
      if (item.orderFilled) {
        item.filledBy = this.$store.state.auth.user?.display_name
      }
      this.checkOrderCompleted()
    },

    checkOrderCompleted() {
      this.completeBtn = true
      for (const item of this.recoveryItems) {
        if (!item.orderFilled) {
          this.completeBtn = false
          return
        }
      }
    },

    checkFields() {
      if (this.allUploadingDocuments?.length > 0) {
        for (const doc of this.allUploadingDocuments) {
          if (doc.type != "application/pdf") {
            this.alertMsg = "Please upload the Quote PDF file."
            this.alert = true
            return false
          }
        }
      }

      if (this.type == "Approve") {
        let itemErr = false
        for (const item of this.recoveryItems) {
          //console.log(item)
          item.state.clientChangeErr =
            item.originalQuantity &&
            !item.clientChange &&
            Number(item.originalQuantity) != Number(item.quantity)
              ? true
              : false
          if (item.state.clientChangeErr) itemErr = true
        }
        return !itemErr
      }

      if (this.type == "Add New" || this.type == "Edit") {
        this.state.employeeNameErr = this.employeeName ? false : true
        // this.state.refNumErr = this.refNum? false : true;
        this.state.departmentErr = this.department ? false : true
        this.state.requastorEmailErr = this.requastorEmail ? false : true
        // this.state.employeeBranchErr = this.employeeBranch? false : true;
        // this.state.employeeMailCdErr = this.employeeMailCd? false : true;
        this.state.recoveryItemsErr = this.recoveryItems?.length > 0 ? false : true

        let itemErr = false
        for (const item of this.recoveryItems) {
          item.state.itemCategoryErr = item.itemCatID ? false : true
          // item.state.descriptionErr = item.description? false : true;
          item.state.quantityErr = item.quantity ? false : true
          item.state.unitPriceErr = item.unitPrice ? false : true
          if (
            item.state.itemCategoryErr ||
            // item.state.descriptionErr ||
            item.state.unitPriceErr ||
            item.state.quantityErr
          )
            itemErr = true
        }
        if (itemErr) return false

        for (const key of Object.keys(this.state)) {
          if (this.state[key]) return false
        }
      }
      return true
    },

    saveNewRecovery(status) {
      if (this.checkFields()) {
        this.alert = false
        this.savingData = true
        this.readonly = true
        const name = this.employeeName.split(".")
        let body = {
          recoveryItems: this.recoveryItems,
          status: status,
          action: this.getActionType(status),
          totalPrice: this.total,
        }
        if (status == "Draft" || status == "Routed For Approval") {
          body = {
            ...body,
            firstName: name[0],
            lastName: name[1],
            department: this.department,
            branch: this.getItemsBranch(),
            employeeBranch: this.employeeBranch,
            employeeUnit: this.employeeUnit,
            mailcode: this.employeeMailCd,
            requastorEmail: this.requastorEmail,
            refNum: this.refNum,
            description: this.requestDescription,
          }
          for (const item of body.recoveryItems) {
            item.orderFilled = false
          }
        } else if (status == "Complete") {
          body = {
            ...body,
            completeDate: new Date(),
            completeUser: this.$store.state.auth.user?.data?.display_name,
          }
        } else if (status == "Purchase Approved") {
          body = {
            ...body,
            submissionDate: new Date(),
            description: this.requestDescription,
            declineRequest: false,
          }
          for (const item of body.recoveryItems) {
            item.approvedCost = (Number(item.unitPrice) * Number(item.quantity)).toFixed(2)
          }
        } else if (status == "Re-Draft") {
          body = {
            ...body,
            description: this.requestDescription,
            reasonForDecline: this.reasonForDecline.slice(0, 255),
            declineRequest: true,
          }
          for (const item of body.recoveryItems) {
            item.approvedCost = null
          }
        }
        // console.log(body);
        const id = this.recovery?.recoveryID ? this.recovery.recoveryID : 0
        axios
          .post(`${RECOVERIES_URL}/${id}`, body)
          .then(async (resp) => {
            if (this.reader.result) await this.saveBackUPFile(resp.data.recoveryID)
            this.savingData = false
            this.readonly = this.isReadOnly()
            this.closeDialog()
          })
          .catch((e) => {
            this.savingData = false
            this.readonly = this.isReadOnly()
            console.log(e)
            this.alertMsg = e.response.data
            this.alert = true
          })
      }
    },

    async saveBackUPFile(recoveryID) {
      this.alert = false
      const formData = new FormData()

      for (const doc of this.toUpload) {
        formData.append("files", doc)
      }

      return await axios
        .post(`${RECOVERIES_URL}/${recoveryID}/backup-documents`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then(() => {
          this.savingData = false
          this.loadRecovery()
        })
        .catch((e) => {
          this.savingData = false
          console.log(e.response.data)
          this.alertMsg = e.response.data
          this.alert = true
        })
    },

    removeItem(item) {
      this.recoveryItems = this.recoveryItems.filter(
        (recoveryItem) => !(recoveryItem.tmpId == item.tmpId)
      )
      this.calculateTotalPrice()
    },

    uploadDocument() {
      this.alert = false
      const el = document.getElementById("inputfile")
      if (el) el.click()
    },

    handleSelectedFile(event) {
      event.preventDefault()
      event.stopPropagation()

      this.toUpload = event.target.files

      if (this.recovery && this.recovery.recoveryID) this.saveBackUPFile(this.recovery?.recoveryID)
    },

    downloadDocument(document, itemCatID) {
      let url = `${RECOVERIES_URL}/${this.recovery.recoveryID}/backup-documents/${document.docName}`
      if (!itemCatID && !this.recovery.recoveryID) return
      if (itemCatID) {
        url = `${ADMIN_URL}/item-category-documents/${itemCatID}/${document.docName}`
      }

      window.open(url)
    },

    async deleteDocument(document) {
      return await axios
        .delete(
          `${RECOVERIES_URL}/${this.recovery.recoveryID}/backup-documents/${document.documentID}`
        )
        .then(() => {
          this.savingData = false
          this.loadRecovery()
        })
        .catch((e) => {
          this.alertMsg = e.response.data
          this.alert = true
        })
    },

    async loadRecovery() {
      return axios
        .get(`${RECOVERIES_URL}/${this.recovery.recoveryID}`)
        .then((res) => {
          const recovery = res.data
          this.recovery.docName = recovery.docName
          this.recovery.recoveryAudits = recovery.recoveryAudits

          this.recoveryAudits = recovery.recoveryAudits.sort((a, b) => {
            return a.date > b.date ? -1 : 1
          })

          this.recovery.recoveryItems = recovery.recoveryItems
        })
        .catch((e) => {
          console.log(e)
        })
    },

    getItemsBranch() {
      const itemCatIds = this.recoveryItems.map((item) => item.itemCatID)
      const branches = []
      this.itemCategoryList.forEach((item) => {
        if (itemCatIds.includes(item.value)) {
          const itembranchs = item.branch.split("/")
          for (const branch of itembranchs) {
            if (!branches.includes(branch)) branches.push(branch)
          }
        }
      })
      // console.log(branches)
      return branches.join("/")
    },

    getActionType(status) {
      if (status == "Routed For Approval") return "Routed For Approval"
      if (status == "Re-Draft") return `Request Declined (${this.reasonForDecline.slice(0, 25)}...)`
      if (status == "Purchase Approved") return "Purchase Approved"
      if (status == "Partially Fullfilled") return "Partially Filled Items"
      if (status == "Fullfilled") return "Filled Items"
      if (status == "Complete") return "Completed Request"
      if (this.type == "Add New" && status == "Draft") return "Draft"
      if (this.type == "Edit" && status == "Draft") return "Updated Request"
    },

    closeDialog() {
      this.addNewRecoveryDialog = false
      this.$emit("updateTable")
    },
  },
}
</script>

<style scoped>
.v-text-field--solo.error--text {
  background: red;
  border: 1px solid red;
}
::v-deep(.text-warning textarea) {
  color: #563b00 !important;
}

::v-deep(.bg-success .v-input--selection-controls__input) {
  background: #e8f5e9 !important;
}
/* 
::v-deep(tbody tr:nth-of-type(even)) {
  background-color: rgba(0, 0, 0, 0.05);
} */
</style>
