import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}
function daysAgo(n: number) {
  return daysFromNow(-n);
}

async function main() {
  console.log("Seeding demo data...");

  const manager = await prisma.user.create({
    data: { name: "Priya Nair", email: "priya@example.com", role: "MANAGER" },
  });

  const alex = await prisma.user.create({
    data: { name: "Alex Chen", email: "alex@example.com", role: "STAFF", managerId: manager.id },
  });
  const jordan = await prisma.user.create({
    data: { name: "Jordan Blake", email: "jordan@example.com", role: "STAFF", managerId: manager.id },
  });
  const sam = await prisma.user.create({
    data: { name: "Sam Ortiz", email: "sam@example.com", role: "STAFF", managerId: manager.id },
  });

  await prisma.user.create({ data: { name: "Ops Admin", email: "admin@example.com", role: "ADMIN" } });

  // --- Job 1: on track, currently with Alex, Jordan up next -----------------
  const job1 = await prisma.job.create({
    data: {
      bcJobId: "J-10042",
      jobNumber: "10042",
      name: "Riverside Office Fit-Out",
      client: "Meridian Holdings",
      dueDate: daysFromNow(24),
      importedAt: new Date(),
    },
  });
  const j1t1 = await prisma.task.create({
    data: {
      jobId: job1.id,
      name: "Site survey & measure-up",
      sequence: 1,
      status: "COMPLETE",
      completionPercent: 100,
      assignedUserId: alex.id,
      startedAt: daysAgo(10),
      completedAt: daysAgo(7),
      expectedCompletionDate: daysAgo(7),
      originalExpectedCompletionDate: daysAgo(8),
    },
  });
  const j1t2 = await prisma.task.create({
    data: {
      jobId: job1.id,
      name: "Materials procurement",
      sequence: 2,
      status: "IN_PROGRESS",
      completionPercent: 55,
      assignedUserId: alex.id,
      startedAt: daysAgo(6),
      expectedCompletionDate: daysFromNow(4),
      originalExpectedCompletionDate: daysFromNow(1),
    },
  });
  await prisma.task.create({
    data: {
      jobId: job1.id,
      name: "Install & fit-out",
      sequence: 3,
      status: "NOT_STARTED",
      assignedUserId: jordan.id,
    },
  });
  await prisma.dueDateChangeLog.create({
    data: {
      taskId: j1t2.id,
      userId: alex.id,
      oldDate: daysFromNow(1),
      newDate: daysFromNow(4),
      reason: "MATERIAL_DELAY",
      note: "Supplier pushed steel framing delivery back 3 days.",
      changedAt: daysAgo(1),
    },
  });
  await prisma.taskEvent.createMany({
    data: [
      { taskId: j1t1.id, userId: alex.id, type: "STARTED" },
      { taskId: j1t1.id, userId: alex.id, type: "COMPLETED" },
      { taskId: j1t2.id, userId: alex.id, type: "STARTED" },
      { taskId: j1t2.id, userId: alex.id, type: "DUE_DATE_CHANGED" },
    ],
  });

  // --- Job 2: overdue current task with Jordan, nearing due date -----------
  const job2 = await prisma.job.create({
    data: {
      bcJobId: "J-10057",
      jobNumber: "10057",
      name: "Harbourview Retail Refresh",
      client: "Coastal Retail Group",
      dueDate: daysFromNow(3),
      importedAt: new Date(),
    },
  });
  await prisma.task.create({
    data: {
      jobId: job2.id,
      name: "Design sign-off",
      sequence: 1,
      status: "COMPLETE",
      completionPercent: 100,
      assignedUserId: sam.id,
      startedAt: daysAgo(20),
      completedAt: daysAgo(15),
      expectedCompletionDate: daysAgo(15),
      originalExpectedCompletionDate: daysAgo(15),
    },
  });
  const j2t2 = await prisma.task.create({
    data: {
      jobId: job2.id,
      name: "Shopfitting works",
      sequence: 2,
      status: "IN_PROGRESS",
      completionPercent: 30,
      assignedUserId: jordan.id,
      startedAt: daysAgo(9),
      expectedCompletionDate: daysAgo(2),
      originalExpectedCompletionDate: daysFromNow(2),
    },
  });
  await prisma.task.create({
    data: { jobId: job2.id, name: "Final inspection", sequence: 3, status: "NOT_STARTED", assignedUserId: sam.id },
  });
  await prisma.dueDateChangeLog.createMany({
    data: [
      {
        taskId: j2t2.id,
        userId: jordan.id,
        oldDate: daysFromNow(2),
        newDate: daysAgo(2),
        reason: "REWORK",
        note: "Client changed shelving spec after initial install.",
        changedAt: daysAgo(5),
      },
    ],
  });

  // --- Job 3: not yet started, further out, includes a logged idle gap -----
  const job3 = await prisma.job.create({
    data: {
      bcJobId: "J-10061",
      jobNumber: "10061",
      name: "Northgate Warehouse Extension",
      client: "Pallmark Logistics",
      dueDate: daysFromNow(45),
      importedAt: new Date(),
    },
  });
  const j3t1 = await prisma.task.create({
    data: {
      jobId: job3.id,
      name: "Permits & approvals",
      sequence: 1,
      status: "COMPLETE",
      completionPercent: 100,
      assignedUserId: sam.id,
      startedAt: daysAgo(30),
      completedAt: daysAgo(22),
      expectedCompletionDate: daysAgo(22),
      originalExpectedCompletionDate: daysAgo(24),
    },
  });
  const j3t2 = await prisma.task.create({
    data: {
      jobId: job3.id,
      name: "Groundworks",
      sequence: 2,
      status: "IN_PROGRESS",
      completionPercent: 10,
      assignedUserId: alex.id,
      startedAt: daysAgo(3),
      expectedCompletionDate: daysFromNow(20),
      originalExpectedCompletionDate: daysFromNow(20),
    },
  });
  await prisma.task.create({
    data: { jobId: job3.id, name: "Structural steel", sequence: 3, status: "NOT_STARTED", assignedUserId: jordan.id },
  });
  // Job 3 sat idle for ~19 days between the permits task completing and groundworks starting.
  await prisma.idleGap.create({
    data: {
      jobId: job3.id,
      fromTaskId: j3t1.id,
      toTaskId: j3t2.id,
      idleStart: daysAgo(22),
      idleEnd: daysAgo(3),
      durationMins: 19 * 24 * 60,
    },
  });

  console.log("Seed complete. Log in as any of: priya@example.com (manager), alex@example.com, jordan@example.com, sam@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
