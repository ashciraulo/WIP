import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const usersRouter = Router();

// Used to populate "assign to" pickers. Scoped to active users only.
usersRouter.get("/", requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true, managerId: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});
