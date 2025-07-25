import { isEmpty, isNil, isNumber } from "lodash"

import BaseService from "@/services/base-service"
import db from "@/data/db-client"

export class CreateService extends BaseService {
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

    const {
      jvNum,
      department,
      period,
      jvAmount,
      status,
      jvDate,
      fiscalYear,
      ...optionalAttributes
    } = this.attributes

    if (isNil(jvNum) || isEmpty(jvNum)) {
      throw new Error("jvNum is required")
    }

    if (isNil(department) || isEmpty(department)) {
      throw new Error("department is required")
    }

    if (isNil(period) || !isNumber(period)) {
      throw new Error("period is required")
    }

    if (isNil(jvAmount) || !isNumber(jvAmount)) {
      throw new Error("jvAmount is required")
    }

    if (isNil(status) || isEmpty(status)) {
      throw new Error("status is required")
    }

    if (isNil(jvDate) || isEmpty(jvDate)) {
      throw new Error("jvDate is required")
    }

    if (isNil(fiscalYear) || isEmpty(fiscalYear)) {
      throw new Error("fiscalYear is required")
    }

    const submissionDate = new Date()

    return db.transaction(async (trx) => {
      const [insertedJournal] = await trx("JournalVoucher")
        .insert({
          ...optionalAttributes,
          submissionDate,
          jvNum,
          department,
          period,
          jvAmount,
          status,
          jvDate,
          fiscalYear,
        })
        .returning("*")

      if (this.recoveryIDs) {
        await trx("Recovery")
          .update({ journalID: insertedJournal.journalID })
          .whereIn("recoveryID", this.recoveryIDs)
      }

      await this.addJournalAudit(insertedJournal.journalID, currentUserDisplayName, status, trx)

      return insertedJournal
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

export default CreateService
