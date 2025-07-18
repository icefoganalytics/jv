import { isNil } from "lodash"

import BaseService from "@/services/base-service"
import db from "@/data/db-client"

export class UpdateService extends BaseService {
  constructor(
    private attributes: any,
    private currentUser: any,
    private recoveryIDs: number[]
  ) {
    super()
  }

  async perform() {
    if (isNil(this.currentUser)) {
      throw new Error("Current user is required")
    }

    const currentUserDisplayName = this.currentUser.display_name

    if (isNil(this.attributes.journalID)) {
      throw new Error("Journal ID is required")
    }

    return db.transaction(async (trx) => {
      const updatedJournal = await trx("JournalVoucher")
        .update(this.attributes)
        .returning("*")
        .first()

      if (this.recoveryIDs) {
        // Remove association of recoveries that are not recoveryIDs
        await trx("Recovery")
          .update({ journalID: null })
          .where("journalID", updatedJournal.journalID)
          .whereNotIn("recoveryID", this.recoveryIDs)

        // Add association of recoveries that are in recoveryIDs
        await trx("Recovery")
          .update({ journalID: updatedJournal.journalID })
          .whereIn("recoveryID", this.recoveryIDs)
      }

      await this.addJournalAudit(
        updatedJournal.journalID,
        currentUserDisplayName,
        this.attributes.status,
        trx
      )

      return updatedJournal
    })
  }

  private async addJournalAudit(journalID: number, user: string, action: string, trx: any) {
    const newJournalAudit = {
      date: new Date(),
      journalID,
      user,
      action,
    }
    return trx("JournalAudit").insert(newJournalAudit, "journalID")
  }
}

export default UpdateService
