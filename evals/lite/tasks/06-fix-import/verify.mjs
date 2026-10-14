import { spawnSync } from "node:child_process";
const r = spawnSync(process.execPath, ["main.mjs"], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
if (String(r.stdout).trim() !== "7") { console.error("out", r.stdout); process.exit(1); }
console.log("PASS");