import { spawnSync } from "node:child_process";
const r = spawnSync(process.execPath, ["scripts/ping.mjs"], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
if (String(r.stdout).trim() !== "pong") { console.error(JSON.stringify(r.stdout)); process.exit(1); }
console.log("PASS");