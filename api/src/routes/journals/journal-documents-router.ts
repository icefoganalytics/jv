import { isArray } from "lodash"
import express, { Response } from "express"

import db from "@/data/db-client"

import { ReturnValidationErrors } from "@/middleware"
import {
  AuthorizationRequest,
  RequiresRoleAdminOrTech,
} from "@/middleware/authorization-middleware"

export const journalDocumentsRouter = express.Router()

journalDocumentsRouter.get(
  "/:journalID/:docName",
  ReturnValidationErrors,
  async function (req, res) {
    try {
      const journalID = req.params.journalID
      const docName = req.params.docName
      const doc = await db("JournalDocs")
        .select("document")
        .where("journalID", journalID)
        .where("docName", docName)
        .first()
      res.status(200).send(doc.document)
    } catch (error: any) {
      console.log(error)
      res.status(500).json("PDF not Found")
    }
  }
)

journalDocumentsRouter.post(
  "/:journalID",
  RequiresRoleAdminOrTech,
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    const files = req.files

    const journalID = Number(req.params.journalID)
    const user = req.currentUser?.display_name ?? ""

    if (files) {
      const fileList = isArray(files.files) ? files.files : [files.files]

      try {
        await db.transaction(async (trx) => {
          for (const file of fileList) {
            const backupDoc = await trx("JournalDocs")
              .select("documentID")
              .where("journalID", journalID)
              .where("docName", file.name)
              .first()

            if (backupDoc) {
              await trx("JournalDocs")
                .update({
                  document: file.data,
                })
                .where({ journalID: journalID, docName: file.name })
            } else {
              const newDocument = {
                journalID: journalID,
                docName: file.name,
                document: file.data,
              }
              await trx("JournalDocs").insert(newDocument)
            }
          }

          const action = "Added File(s): " + fileList.map((f) => f.name).join(", ")

          await addJournalAudit(journalID, user, action, trx)

          return res.status(200).json("Successful")
        })
      } catch (error: any) {
        console.log(error)
        return res.status(500).json("Insert failed")
      }
    }
  }
)

async function addJournalAudit(journalID: number, user: string, action: string, myDb = db) {
  const newJournalAudit = {
    date: new Date(),
    journalID: journalID,
    user: user,
    action: action,
  }
  return await db("JournalAudit").insert(newJournalAudit, "journalID")
}
