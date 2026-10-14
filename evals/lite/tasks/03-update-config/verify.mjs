import fs from "node:fs";
const c = JSON.parse(fs.readFileSync("config.json","utf8"));
if (c.port !== 8080 || c.name !== "demo") { console.error(c); process.exit(1); }
console.log("PASS");