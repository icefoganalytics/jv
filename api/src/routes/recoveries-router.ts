import { isNumber } from "lodash"
import express, { Request, Response } from "express"

import db from "@/data/db-client"

import { DB_SCHEMA } from "@/config"
import { RECOVERY_WHERE_OPTIONS } from "@/models/recovery"

import { ReturnValidationErrors } from "@/middleware"
import { AuthorizationRequest } from "@/middleware/authorization-middleware"
import { sendPendingApprovalEmail, sendPurchaseApprovedEmail } from "@/services/email"
import { UserService } from "@/services"

import { backupDocumentsRouter } from "@/routes/recoveries/backup-documents-router"
import { recoverableRouter } from "@/routes/recoveries/recoverable-router"

export const recoveriesRouter = express.Router()
const userService = new UserService()

recoveriesRouter.use("/:recoveryID/backup-documents", backupDocumentsRouter)
recoveriesRouter.use("/recoverable", recoverableRouter)

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
