import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { fetchJobsFromBC } from "../services/bcClient";

export const bcRouter = Router();

/**
 * Pulls jobs from Business Central (or the local fixture, see bcClient.ts)
 * and upserts them by bcJobId. Deliberately does NOT touch task lines —
 * those are created inside the app once a job is imported, since BC has no
 * concept of our per-task workflow.
 */
bcRouter.post("/import-jobs", requireAuth, requireRole("MANAGER", "ADMIN"), async (_req, res) => {
  const bcJobs = await fetchJobsFromBC();

  const results = await Promise.all(
    bcJobs.map((bcJob) =>
      prisma.job.upsert({
        where: { bcJobId: bcJob.bcJobId },
        update: {
          jobNumber: bcJob.jobNumber,
          name: bcJob.name,
          client: bcJob.client,
          dueDate: bcJob.dueDate ? new Date(bcJob.dueDate) : null,
        },
        create: {
          bcJobId: bcJob.bcJobId,
          jobNumber: bcJob.jobNumber,
          name: bcJob.name,
          client: bcJob.client,
          dueDate: bcJob.dueDate ? new Date(bcJob.dueDate) : null,
          importedAt: new Date(),
        },
      })
    )
  );

  res.json({ imported: results.length, jobs: results });
});
