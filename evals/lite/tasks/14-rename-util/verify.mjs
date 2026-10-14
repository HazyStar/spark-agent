import { spawnSync } from "node:child_process";
const r = spawnSync(process.execPath, ["app.mjs"], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
if (String(r.stdout).trim() !== "SPARK") { console.error(r.stdout); process.exit(1); }
import fs from "node:fs";
const util = fs.readFileSync("util.js","utf8");
if (/oldName/.test(util) || !/newName/.test(util)) { console.error("util not renamed"); process.exit(1); }
console.log("PASS");