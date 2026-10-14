import fs from "node:fs";
const raw = fs.readFileSync("report.json","utf8");
const obj = JSON.parse(raw);
const keys = Object.keys(obj).sort();
if (keys.join(",") !== "score,status") { console.error("keys", keys); process.exit(1); }
if (obj.status !== "ok") { console.error("status", obj.status); process.exit(1); }
if (obj.score !== 100 || typeof obj.score !== "number") { console.error("score", obj.score, typeof obj.score); process.exit(1); }
console.log("PASS");