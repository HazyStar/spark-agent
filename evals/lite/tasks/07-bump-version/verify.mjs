import fs from "node:fs";
const p = JSON.parse(fs.readFileSync("package.json","utf8"));
if (p.version !== "0.1.0" || p.name !== "lite-demo") { console.error(p); process.exit(1); }
console.log("PASS");