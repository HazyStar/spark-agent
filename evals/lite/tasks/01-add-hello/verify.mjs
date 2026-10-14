import fs from "node:fs";
const t = fs.readFileSync("hello.txt","utf8");
if (t !== "spark-ok\n" && t !== "spark-ok") {
  console.error("FAIL content:", JSON.stringify(t));
  process.exit(1);
}
console.log("PASS");