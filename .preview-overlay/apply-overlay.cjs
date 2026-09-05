const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = process.cwd();
const partsDir = path.join(root, ".preview-overlay", "parts");
const partFiles = fs.readdirSync(partsDir).filter((name) => name.endsWith(".b64part")).sort();
if (!partFiles.length) throw new Error("Preview overlay parts are missing.");
const encoded = partFiles.map((name) => fs.readFileSync(path.join(partsDir, name), "utf8").trim()).join("");
const payload = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));
if (!payload || payload.version !== 1 || !payload.files || typeof payload.files !== "object") {
  throw new Error("Invalid preview overlay payload.");
}
let count = 0;
for (const [relativePath, content] of Object.entries(payload.files)) {
  if (typeof relativePath !== "string" || relativePath.includes("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe overlay path: ${relativePath}`);
  }
  if (typeof content !== "string") throw new Error(`Invalid overlay content: ${relativePath}`);
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  count += 1;
}
console.log(`[preview-overlay] Applied ${count} Release Candidate files.`);
