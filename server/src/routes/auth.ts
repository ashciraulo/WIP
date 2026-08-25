import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../middleware/auth";
import { Role } from "../domain";

export const authRouter = Router();

// NOTE: this is a placeholder login for internal dev/demo use — anyone who
// knows a colleague's email can "sign in" as them. Before this tool touches
// real data, swap this for the company's actual identity provider (Entra
// ID / Google Workspace SSO) and keep signToken() as the only thing that
// issues sessions.
authRouter.post("/login", async (req, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Valid email required" });

  const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  if (!user || !user.active) return res.status(401).json({ error: "No active account for that email" });

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role as Role, managerId: user.managerId });
  res.json({ token, user });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});
