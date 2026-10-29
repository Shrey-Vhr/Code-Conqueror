// Production entrypoint for hosts with a writable disk (Render, Railway, Fly, a VPS).
// 1. create/upgrade the SQLite schema, 2. seed the demo campus the first time, 3. start Next.js.
import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "db", "push", "--skip-generate"]);

const prisma = new PrismaClient();
const users = await prisma.user.count();
await prisma.$disconnect();

if (users === 0) {
  console.log("Empty database: loading the demo campus...");
  run("npx", ["tsx", "prisma/seed.ts"]);
} else {
  console.log(`Database already has ${users} users; skipping seed.`);
}

const port = process.env.PORT || "3000";
const server = spawn("npx", ["next", "start", "-p", port, "-H", "0.0.0.0"], {
  stdio: "inherit",
  shell: true,
});
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
