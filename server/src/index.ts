import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { jobsRouter } from "./routes/jobs";
import { tasksRouter } from "./routes/tasks";
import { dashboardRouter } from "./routes/dashboard";
import { analyticsRouter } from "./routes/analytics";
import { bcRouter } from "./routes/bcIntegration";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/bc", bcRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`WIP tracker API listening on :${port}`));
