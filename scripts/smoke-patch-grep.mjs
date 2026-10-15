import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyPatchTool, parseApplyPatch } from "../dist/tools/apply_patch.js";
import { grepTool } from "../dist/tools/grep.js";
import { executeTool } from "../dist/tools/index.js";

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "spark-patch-"));
await fs.writeFile(
  path.join(tmp, "math.js"),
  "export function add(a, b) {\n  return a - b;\n}\n",
);
await fs.writeFile(path.join(tmp, "note.txt"), "hello spark\nfoo bar\n");

const patch = `*** Begin Patch
*** Update File: math.js
<<<<<<< SEARCH
  return a - b;
=======
  return a + b;
>>>>>>> REPLACE
*** Add File: hello.js
export const hello = () => 'hi';
*** End Patch`;

const actions = parseApplyPatch(patch);
console.log(
  "parsed actions",
  actions.map((a) => `${a.kind}:${a.path}`).join(", "),
);
console.log(await applyPatchTool(tmp, patch));
console.log("math.js =>", await fs.readFile(path.join(tmp, "math.js"), "utf8"));

console.log(await grepTool(tmp, "return a", { glob: "*.js" }));
console.log(await executeTool(tmp, "grep", JSON.stringify({ pattern: "hello", path: "." })));

const bad = await executeTool(tmp, "apply_patch", JSON.stringify({ patch: "not a patch" }));
if (!bad.startsWith("Tool error")) {
  throw new Error(`expected Tool error prefix, got: ${bad}`);
}
console.log("bad patch ok:", bad.slice(0, 60));

await fs.rm(tmp, { recursive: true, force: true });
console.log("OK");
