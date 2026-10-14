import fs from "node:fs";
const t = fs.readFileSync("README.md","utf8");
if (!t.includes("# Lite Demo")) { console.error("missing header"); process.exit(1); }
if (!t.split(/\r?\n/).some(l => l.trim() === "Built with Spark Agent")) {
  console.error("missing line"); process.exit(1); process.exit(1);
}
console.log("PASS");