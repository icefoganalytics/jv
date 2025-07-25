import { isArray, isNil } from "lodash"
import express, { Response } from "express"

import db from "@/data/db-client"

import { ReturnValidationErrors } from "@/middleware"
import {
  AuthorizationRequest,
  RequiresRoleAdminOrTech,
} from "@/middleware/authorization-middleware"

export const backupDocumentsRouter = express.Router()

backupDocumentsRouter.get("/:documentID", ReturnValidationErrors, async function (req, res) {
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
})

backupDocumentsRouter.post(
  "/",
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

backupDocumentsRouter.delete(
  "/:documentID",
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
