import express, { Response } from "express"

import db from "@/data/db-client"

import { ReturnValidationErrors } from "@/middleware"
import {
  AuthorizationRequest,
  RequiresRoleAdminOrIctFinance,
} from "@/middleware/authorization-middleware"

export const recoverableRouter = express.Router()

recoverableRouter.post(
  "/:journalID",
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

//___AUDIT___
async function addJournalAudit(journalID: number, user: string, action: string, myDb = db) {
  const newJournalAudit = {
    date: new Date(),
    journalID: journalID,
    user: user,
    action: action,
  }
  return await db("JournalAudit").insert(newJournalAudit, "journalID")
}
