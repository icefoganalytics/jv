import express, { Request, Response } from "express"

import db from "@/data/db-client"

import { ReturnValidationErrors } from "@/middleware"
import {
  AuthorizationRequest,
  RequiresRoleAdminOrFinance,
  RequiresRoleAdminOrIctFinance,
} from "@/middleware/authorization-middleware"

import { CreateService, UpdateService } from "@/services/journals"

import { journalDocumentsRouter } from "@/routes/journals/journal-documents-router"

export const journalsRouter = express.Router()

journalsRouter.use("/journal-documents", journalDocumentsRouter)

journalsRouter.get(
  "/",
  RequiresRoleAdminOrFinance,
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    const roles = (req.currentUser?.roles ?? "").split(",")

    const adminQuery = function (queryBuilder: any) {
      if (roles.indexOf("Admin") >= 0) queryBuilder.select("*")
      else if (roles.indexOf("IctFinance") >= 0) queryBuilder.select("*")
      else
        queryBuilder
          .where("department", req.currentUser?.department)
          .whereNot("status", "Draft")
          .select("*")
    }

    const journals = await db("JournalVoucher").modify(adminQuery)
    for (const journal of journals) {
      const recoveries = await db("Recovery").select("*").where("journalID", journal.journalID)
      for (const recovery of recoveries) {
        const recoveryItems = await db("RecoveryItem")
          .select("*")
          .where("recoveryID", recovery.recoveryID)
        recovery.recoveryItems = recoveryItems
      }
      journal.recoveries = recoveries

      const journalDocument = await db("JournalDocs")
        .select("docName")
        .where("journalID", journal.journalID)
      journal.docName = journalDocument?.length > 0 ? journalDocument : ""

      const journalAudits = await db("JournalAudit")
        .select("*")
        .where("journalID", journal.journalID)
      journal.journalAudits = journalAudits
    }

    res.status(200).json({ journals, totalCount: journals.length })
  }
)

journalsRouter.get(
  "/:journalID",
  RequiresRoleAdminOrFinance,
  ReturnValidationErrors,
  async function (req: Request, res: Response) {
    const journalID = Number(req.params.journalID)

    const journal = await db("JournalVoucher").select("*").where("journalID", journalID).first()

    const recoveries = await db("Recovery").select("*").where("journalID", journalID)
    for (const recovery of recoveries) {
      const recoveryItems = await db("RecoveryItem")
        .select("*")
        .where("recoveryID", recovery.recoveryID)
      recovery.recoveryItems = recoveryItems
      const recoveryAudits = await db("RecoveryAudit")
        .select("*")
        .where("recoveryID", recovery.recoveryID)
      recovery.recoveryAudits = recoveryAudits
      const recoveryDocument = await db("BackUpDocs")
        .select("docName")
        .where("recoveryID", recovery.recoveryID)
      recovery.docName = recoveryDocument?.length > 0 ? recoveryDocument : ""
    }
    journal.recoveries = recoveries

    const journalDocument = await db("JournalDocs").select("docName").where("journalID", journalID)
    journal.docName = journalDocument?.length > 0 ? journalDocument : ""

    const journalAudits = await db("JournalAudit").select("*").where("journalID", journal.journalID)
    journal.journalAudits = journalAudits

    res.status(200).json({ journal })
  }
)

journalsRouter.post(
  "/",
  RequiresRoleAdminOrIctFinance,
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    try {
      const recoveryIDs = req.body.recoveryIDs
      delete req.body.recoveryIDs

      const newJournal = await CreateService.perform(req.body, req.currentUser, recoveryIDs)

      res.status(201).json({ journal: newJournal })
    } catch (error: any) {
      console.log(error)
      res.status(500).json("Insert failed")
    }
  }
)

journalsRouter.put(
  "/:journalID",
  RequiresRoleAdminOrIctFinance,
  ReturnValidationErrors,
  async function (req: AuthorizationRequest, res: Response) {
    req.body.journalID = Number(req.params.journalID)

    try {
      const recoveryIDs = req.body.recoveryIDs
      delete req.body.recoveryIDs

      const updatedJournal = await UpdateService.perform(req.body, req.currentUser, recoveryIDs)

      res.status(200).json({ journal: updatedJournal })
    } catch (error: any) {
      console.log(error)
      res.status(500).json("Update failed")
    }
  }
)

journalsRouter.delete(
  "/:journalID",
  RequiresRoleAdminOrIctFinance,
  ReturnValidationErrors,
  async function (req: Request, res: Response) {
    const journalID = Number(req.params.journalID)

    try {
      await db("JournalVoucher").delete().where("journalID", journalID)
      res.status(200).json("successful")
    } catch (error: any) {
      console.log(error)
      res.status(500).json("Delete failed")
    }
  }
)
