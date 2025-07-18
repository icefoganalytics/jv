import { isArray, isNil, isNumber } from "lodash"
import express, { Request, Response } from "express"
import knex from "knex"

import { ReturnValidationErrors } from "@/middleware"
import { DB_SCHEMA, DB_CONFIG } from "@/config"
import { sendPendingApprovalEmail, sendPurchaseApprovedEmail } from "@/services/email"
import { UserService } from "@/services"
import {
  AuthorizationRequest,
  RequiresRoleAdminOrIctFinance,
  RequiresRoleAdminOrTech,
} from "@/middleware/authorization-middleware"
import { RECOVERY_WHERE_OPTIONS } from "@/models/recovery"

const db = knex(DB_CONFIG)

export const recoveriesRouter = express.Router()
const userService = new UserService()

//____Recovery_DOCUMENTS____
recoveriesRouter.get(
  "/backup-documents/:recoveryID/:documentID",
  ReturnValidationErrors,
  async function (req, res) {
    const { recoveryID, documentID } = req.params
    const doc = await db("BackUpDocs").where({ recoveryID, documentID }).first()

    if (!doc) return res.status(404).send("Document not found")

    let pdfBuffer = doc.document

    // If the document is stored as a base64 string in the database
    if (typeof doc.document === "string") {
      pdfBuffer = Buffer.from(doc.document, "base64")
    }

    res.setHeader("Content-disposition", `attachment; filename="${doc.docName}"`)
    res.setHeader("Content-type", "application/pdf")
    return res.send(pdfBuffer)
  }
)

recoveriesRouter.post(
  "/backup-documents/:recoveryID",
  RequiresRoleAdminOrTech,
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    const files = req.files
    const recoveryID = parseInt(req.params.recoveryID)
    const user = req.currentUser?.display_name ?? ""

    if (isNil(files)) return res.status(400).send("No files found")

    const fileList = isArray(files.files) ? files.files : [files.files]

    try {
      await db.transaction(async (trx) => {
        for (const file of fileList) {
          const backupDoc = await trx("BackUpDocs")
            .select("documentID")
            .where("recoveryID", recoveryID)
            .where("docName", file.name)
            .first()

          if (backupDoc) {
            await trx("BackUpDocs")
              .update({
                document: file.data,
              })
              .where({ recoveryID: recoveryID, docName: file.name })
          } else {
            const newDocument = {
              recoveryID: recoveryID,
              docName: file.name,
              document: file.data,
            }
            await trx("BackUpDocs").insert(newDocument)
          }
        }

        const action = "Added Back-up: " + fileList.map((f) => f.name).join(", ")

        await addRecoveryAudit(recoveryID, user, action)

        return res.status(200).json("Successful")
      })
    } catch (error: any) {
      console.log(error)
      return res.status(500).json("Insert failed")
    }
  }
)

//____RECOVERABLES___
recoveriesRouter.post(
  "/recoverable/:journalID",
  RequiresRoleAdminOrIctFinance,
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    const journalID = Number(req.params.journalID)
    const user = req.currentUser?.display_name ?? ""

    try {
      await db.transaction(async (trx) => {
        const recoveryIDs = req.body.recoveryIDs
        const jvAmount = req.body.jvAmount

        if (recoveryIDs) {
          await trx("Recovery")
            .update({ journalID: null })
            .where("journalID", journalID)
            .whereNotIn("recoveryID", recoveryIDs)
          await trx("Recovery").update({ journalID: journalID }).whereIn("recoveryID", recoveryIDs)

          await trx("JournalVoucher")
            .update({ jvAmount: Number(jvAmount) })
            .where("journalID", journalID)

          await addJournalAudit(journalID, user, "Modified Recoverables", trx)
        }
      })
      res.status(200).json("successful")
    } catch (error: any) {
      console.log(error)
      res.status(500).json("Remove failed")
    }
  }
)

//____RECOVERIES___
// this needs security of some sort
recoveriesRouter.get("/", async function (req: Request, res: Response) {
  const whereQuery = buildRecoveriesWhereQuery(req.query)

  const itemState = {
    itemCategoryErr: false,
    descriptionErr: false,
    quantityErr: false,
    unitPriceErr: false,
    approvedCostErr: false,
    clientChangeErr: false,
  }

  let tmpId = 1000

  const adminQuery = recoveryRoleCheck(req)
  const recoveries = await db("Recovery").modify(adminQuery).modify(whereQuery)

  for (const recovery of recoveries) {
    const recoveryItems = await db("RecoveryItem")
      .select("*")
      .where("recoveryID", recovery.recoveryID)
    for (const recoveryItem of recoveryItems) {
      recoveryItem.tmpId = tmpId
      recoveryItem.state = itemState
      tmpId++
    }
    recovery.recoveryItems = recoveryItems

    const recoveryAudits = await db("RecoveryAudit")
      .select("*")
      .where("recoveryID", recovery.recoveryID)
    recovery.recoveryAudits = recoveryAudits

    recovery.docName = await db("BackUpDocs")
      .select("documentID", "docName", "itemCatName")
      .where("recoveryID", recovery.recoveryID)

    const journal = await db("JournalVoucher")
      .select("*")
      .where("journalID", recovery.journalID)
      .first()
    recovery.journal = journal ? journal : null
  }

  res.json({ recoveries, totalCount: recoveries.length })
})

recoveriesRouter.get(
  "/:recoveryID",
  ReturnValidationErrors,
  async function (req: Request, res: Response) {
    const itemState = {
      itemCategoryErr: false,
      descriptionErr: false,
      quantityErr: false,
      unitPriceErr: false,
      approvedCostErr: false,
      clientChangeErr: false,
    }

    const recoveryID = Number(req.params.recoveryID)

    let tmpId = 2000

    const adminQuery = recoveryRoleCheck(req)

    const recovery = await db("Recovery").modify(adminQuery).where("recoveryID", recoveryID).first()
    if (!recovery) return res.status(400).json("Recovery Not Found!")

    const recoveryItems = await db("RecoveryItem")
      .select("*")
      .where("recoveryID", recovery.recoveryID)
    for (const recoveryItem of recoveryItems) {
      recoveryItem.tmpId = tmpId
      recoveryItem.state = itemState
      tmpId++
    }
    recovery.recoveryItems = recoveryItems

    const recoveryAudits = await db("RecoveryAudit")
      .select("*")
      .where("recoveryID", recovery.recoveryID)
    recovery.recoveryAudits = recoveryAudits

    recovery.docName = await db("BackUpDocs")
      .select("documentID", "docName", "itemCatName")
      .where("recoveryID", recovery.recoveryID)

    res.json({ recovery })
  }
)

recoveriesRouter.post("/", async function (req: AuthorizationRequest, res: Response) {
  const user = req.currentUser?.display_name ?? ""
  const userEmail = req.currentUser?.email
  const roles = (req.currentUser?.roles ?? "").split(",")

  if (!(roles.includes("Admin") || roles.includes("Agent"))) {
    return res.status(401).send("You are not an authorized person!")
  }

  try {
    await db.transaction(async (trx) => {
      const newRecoveryItems = req.body.recoveryItems
      delete req.body.recoveryItems

      const action = req.body.action ?? "Create New Recovery"
      req.body.status = req.body.status ?? "Draft"
      delete req.body.action

      const newRecovery = req.body

      newRecovery.createUser = userEmail
      newRecovery.modUser = userEmail

      newRecovery.totalPrice = calculateItemTotal(newRecoveryItems)

      var createdRecovery = await trx("Recovery").insert(newRecovery).returning("*")

      let recoveryID = createdRecovery[0].recoveryID

      if (newRecovery.requastorEmail) {
        let requestorUser = await userService.getByEmail(newRecovery.requastorEmail)

        if (!requestorUser) {
          let reqEmployee = await trx("Employees")
            .where({ email: newRecovery.requastorEmail })
            .first()

          if (reqEmployee) {
            await trx("user").insert({
              email: newRecovery.requastorEmail,
              first_name: reqEmployee.first_name,
              last_name: reqEmployee.last_name,
              display_name: reqEmployee.full_name,
              roles: "BranchUser",
              department: reqEmployee.department,
              status: "Active",
              create_date: new Date(),
              auth0_subject: `SUB_MISSING_${newRecovery.requastorEmail}`,
            })
          }
        }
      }

      await trx("RecoveryAudit").insert({
        date: new Date(),
        recoveryID,
        user,
        action,
      })

      for (const newRecoveryItem of newRecoveryItems) {
        if (
          newRecoveryItem.originalQuantity &&
          Number(newRecoveryItem.originalQuantity) != Number(newRecoveryItem.quantity)
        ) {
          await trx("RecoveryAudit").insert({
            date: new Date(),
            recoveryID,
            user,
            action: `Changing Quantity of ${newRecoveryItem.category} from ${newRecoveryItem.originalQuantity} to ${newRecoveryItem.quantity}`,
          })
        }

        await trx.raw(`INSERT INTO BackUpDocs (recoveryID, docName, document, itemCatName, itemCatID)
            SELECT ${recoveryID}, docName, document, ItemCategory.category, ItemCategory.itemCatID
            FROM ItemCategory INNER JOIN ItemCategoryDocs ON ItemCategory.itemCatID = ItemCategoryDocs.itemCatID
            WHERE ItemCategory.itemCatID = ${newRecoveryItem.itemCatID}`)

        delete newRecoveryItem.state
        delete newRecoveryItem.tmpId
        delete newRecoveryItem.revisedCost
        delete newRecoveryItem.originalQuantity
        delete newRecoveryItem.category

        newRecoveryItem.recoveryID = recoveryID

        if (newRecoveryItem.itemID > 0) await insertIntoTable("RecoveryItem", newRecoveryItem, trx)
        else await trx("RecoveryItem").insert(newRecoveryItem)
      }

      await sendEmail(newRecovery, user, recoveryID, trx)

      res.status(200).json({ recovery: createdRecovery[0] })
    })
  } catch (error: any) {
    console.log(error)
    res.status(500).json("Insert failed")
  }
})

recoveriesRouter.put(
  "/:recoveryID",
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    let recoveryID = Number(req.params.recoveryID)
    const user = req.currentUser?.display_name ?? ""
    const userEmail = req.currentUser?.email
    const roles = (req.currentUser?.roles ?? "").split(",")

    if (recoveryID > 0) {
      const adminQuery = recoveryRoleCheck(req)
      const recovery = await db("Recovery")
        .modify(adminQuery)
        .where("recoveryID", recoveryID)
        .first()
      if (!recovery) return res.status(400).json("Recovery Not Found!")
    } else {
      if (!(roles.includes("Admin") || roles.includes("Agent"))) {
        return res.status(401).send("You are not an authorized person!")
      }
    }

    try {
      await db.transaction(async (trx) => {
        const newRecoveryItems = req.body.recoveryItems
        delete req.body.recoveryItems

        const action = req.body.action
        delete req.body.action

        const newRecovery = req.body
        delete newRecovery.recoveryAudits
        delete newRecovery.docName
        delete newRecovery.recoveryID

        if (newRecovery.status != "Purchase Approved" && newRecovery.status != "Re-Draft")
          newRecovery.modUser = userEmail

        newRecovery.totalPrice = calculateItemTotal(newRecoveryItems)
        await trx("Recovery").update(newRecovery).where("recoveryID", recoveryID)

        if (newRecovery.requastorEmail) {
          let requestorUser = await userService.getByEmail(newRecovery.requastorEmail)

          if (!requestorUser) {
            let reqEmployee = await trx("Employees")
              .where({ email: newRecovery.requastorEmail })
              .first()

            if (reqEmployee) {
              await trx("user").insert({
                email: newRecovery.requastorEmail,
                first_name: reqEmployee.first_name,
                last_name: reqEmployee.last_name,
                display_name: reqEmployee.full_name,
                roles: "BranchUser",
                department: reqEmployee.department,
                auth0_subject: `SUB_MISSING_${newRecovery.requastorEmail}`,
                status: "Active",
                create_date: new Date(),
              })
            }
          }
        }

        await trx("RecoveryAudit").insert({
          date: new Date(),
          recoveryID,
          user,
          action,
        })

        await trx("RecoveryItem").delete().where("recoveryID", recoveryID)
        await trx("BackUpDocs").delete().where({ recoveryID: recoveryID }).whereNotNull("itemCatID")

        for (const newRecoveryItem of newRecoveryItems) {
          if (
            newRecoveryItem.originalQuantity &&
            Number(newRecoveryItem.originalQuantity) != Number(newRecoveryItem.quantity)
          ) {
            await trx("RecoveryAudit").insert({
              date: new Date(),
              recoveryID,
              user,
              action: `Changing Quantity of ${newRecoveryItem.category} from ${newRecoveryItem.originalQuantity} to ${newRecoveryItem.quantity}`,
            })
          }

          await trx.raw(`INSERT INTO BackUpDocs (recoveryID, docName, document, itemCatName, itemCatID)
            SELECT ${recoveryID}, docName, document, ItemCategory.category, ItemCategory.itemCatID
            FROM ItemCategory INNER JOIN ItemCategoryDocs ON ItemCategory.itemCatID = ItemCategoryDocs.itemCatID
            WHERE ItemCategory.itemCatID = ${newRecoveryItem.itemCatID}`)

          delete newRecoveryItem.state
          delete newRecoveryItem.tmpId
          delete newRecoveryItem.revisedCost
          delete newRecoveryItem.originalQuantity
          delete newRecoveryItem.category

          newRecoveryItem.recoveryID = recoveryID

          if (newRecoveryItem.itemID > 0)
            await insertIntoTable("RecoveryItem", newRecoveryItem, trx)
          else await trx("RecoveryItem").insert(newRecoveryItem)
        }

        await sendEmail(newRecovery, user, recoveryID, trx)
      })

      res.status(200).json({ recoveryID: recoveryID })
    } catch (error: any) {
      console.log(error)
      res.status(500).json("Insert failed")
    }
  }
)

recoveriesRouter.delete(
  "/:recoveryID",
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    let recoveryID = Number(req.params.recoveryID)

    await db("RecoveryEmail").where({ recoveryID }).delete()
    await db("RecoveryAudit").where({ recoveryID }).delete()
    await db("RecoveryItem").where({ recoveryID }).delete()
    await db("Recovery").where({ recoveryID }).delete()

    res.json({})
  }
)

recoveriesRouter.delete(
  "/:recoveryID/backup-documents/:documentID",
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    let recoveryID = Number(req.params.recoveryID)
    let documentID = Number(req.params.documentID)

    const document = await db("BackUpDocs").where({ documentID, recoveryID }).first()

    if (document) {
      await addRecoveryAudit(
        recoveryID,
        req.currentUser?.display_name ?? "",
        `Removed Back-up: ${document.docName}`
      )
      await db("BackUpDocs").where({ documentID }).delete()
    }

    res.json({})
  }
)

recoveriesRouter.post(
  "/glcode/:recoveryID",
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    let recoveryID = Number(req.params.recoveryID)
    const user = req.currentUser?.display_name ?? ""
    let recoveryAudits: any[] = []
    const adminQuery = recoveryRoleCheck(req)
    const recovery = await db("Recovery").modify(adminQuery).where("recoveryID", recoveryID).first()
    if (!recovery) return res.status(400).json("Recovery Not Found!")
    const newGlcode = req.body.glCode

    try {
      await db.transaction(async (trx) => {
        await trx("Recovery").update({ glCode: newGlcode }).where("recoveryID", recoveryID)

        const action = `Update GL Code to ${newGlcode}`
        await addRecoveryAudit(recoveryID, user, action, trx)

        recoveryAudits = await trx("RecoveryAudit")
          .select("*")
          .where("recoveryID", recovery.recoveryID)
      })
      res.status(200).json({ recoveryAudits: recoveryAudits, glCode: newGlcode })
    } catch (error: any) {
      console.log(error)
      res.status(500).json("Insert failed")
    }
  }
)

//___AUDIT___
async function addRecoveryAudit(recoveryID: number, user: string, action: string, myDb = db) {
  const newRecoveryAudit = {
    date: new Date(),
    recoveryID: recoveryID,
    user: user,
    action: action,
  }
  return myDb("RecoveryAudit").insert(newRecoveryAudit)
}

async function addJournalAudit(journalID: number, user: string, action: string, myDb = db) {
  const newJournalAudit = {
    date: new Date(),
    journalID: journalID,
    user: user,
    action: action,
  }
  return await db("JournalAudit").insert(newJournalAudit, "journalID")
}

//________
//__UTIL__
async function insertIntoTable(table: string, data: any, myDb = db) {
  const schema = DB_SCHEMA
  const { bindings, sql } = myDb.withSchema(schema).insert(data).into(table).toSQL()

  const newQuery = `SET IDENTITY_INSERT ${schema}.${table} ON; ${sql} SET IDENTITY_INSERT ${schema}.${table} OFF;`

  return await myDb.raw(newQuery, bindings)
}

function recoveryRoleCheck(req: any) {
  const user = req.currentUser
  const userEmail = user.email

  const adminQuery = function (queryBuilder: any) {
    const roleArray = (user.roles ?? "").split(",")

    if (roleArray.includes("Admin")) {
      queryBuilder.select("*")
    } else if (roleArray.includes("IctFinance")) {
      queryBuilder.select("*")
    } else if (roleArray.includes("Agent")) {
      queryBuilder.whereLike("supplier", `${user.branch}%`).select("*")
    } else if (roleArray.includes("DeptFinance")) {
      queryBuilder.where("department", user.department).select("*")
    } else {
      queryBuilder.where("requastorEmail", userEmail).select("*")
    }

    queryBuilder.orderBy("fiscal_year", "desc")
    queryBuilder.orderBy("recoveryID", "asc")
  }

  return adminQuery
}

async function sendEmail(newRecovery: any, user: any, recoveryID: number, myDb = db) {
  if (
    newRecovery.status == "Purchase Approved" ||
    newRecovery.status == "Re-Draft" ||
    newRecovery.status == "Routed For Approval"
  ) {
    const recovery = await myDb("Recovery").where("recoveryID", recoveryID).first()

    const sender =
      newRecovery.status == "Routed For Approval" ? recovery.modUser : recovery.requastorEmail
    const recipient =
      newRecovery.status == "Routed For Approval" ? recovery.requastorEmail : recovery.modUser
    const recipientName =
      newRecovery.status == "Routed For Approval"
        ? recovery.firstName + " " + recovery.lastName
        : "Recovery Agent"

    let emailSent = null

    if (newRecovery.status == "Routed For Approval") {
      const reminder = false
      emailSent = await sendPendingApprovalEmail(
        reminder,
        user,
        sender,
        recipient,
        recipientName,
        recovery.department,
        recoveryID
      )
    } else {
      const approved = newRecovery.status == "Purchase Approved"
      emailSent = await sendPurchaseApprovedEmail(
        approved,
        user,
        sender,
        recipient,
        recovery.refNum,
        recovery.department,
        recovery.reasonForDecline,
        recoveryID
      )
    }

    if (!emailSent) return false

    await myDb("RecoveryEmail").insert({
      recoveryID: recoveryID,
      emailType: newRecovery.status,
      sentDate: new Date(),
      sendingUser: sender,
      recipients: recipient,
    })

    const action = `Notification emailed to ${recipient}.`
    await addRecoveryAudit(recoveryID, user, action.slice(0, 49), myDb)
  }

  return true
}

function calculateItemTotal(recoveryItems: { totalPrice: number }[]) {
  let total = 0

  if (recoveryItems && recoveryItems.length > 0) {
    return recoveryItems.reduce(
      (acc, item) => acc + (isNumber(item.totalPrice) ? item.totalPrice : 0),
      0
    )
  }

  return 0
}

function buildRecoveriesWhereQuery(queryParams: any) {
  if (!queryParams?.where || typeof queryParams.where !== "object") {
    return function (queryBuilder: any) {
      return queryBuilder
    }
  }

  const whereOptions = Object.keys(queryParams.where)

  return function (queryBuilder: any) {
    whereOptions.forEach((key) => {
      if (RECOVERY_WHERE_OPTIONS.includes(key)) {
        queryBuilder.where(key, queryParams.where[key])
        console.log(`Valid where option: ${key} = ${queryParams.where[key]}`)
      } else {
        console.log(`Invalid where option: ${key}`)
      }
    })
    return queryBuilder
  }
}
