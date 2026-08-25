import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { Role } from "../domain";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-me";

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export function signToken(user: AuthedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "12h" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthedUser;
    // Re-check the user still exists / is active on every request rather than
    // trusting the token payload for the long tail of a 12h session.
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.active) {
      return res.status(401).json({ error: "User inactive or not found" });
    }
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role as Role, managerId: user.managerId };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
