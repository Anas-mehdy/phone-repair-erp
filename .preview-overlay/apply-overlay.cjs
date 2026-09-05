const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = process.cwd();
const partsDir = path.join(root, ".preview-overlay", "parts");
const fixesDir = path.join(root, ".preview-overlay", "fixes");
const partFiles = fs.readdirSync(partsDir).filter((name) => name.endsWith(".b64part")).sort();
if (!partFiles.length) throw new Error("Preview overlay parts are missing.");

function readPart(name) {
  const stem = name.replace(/\.b64part$/, "");
  const fixDir = path.join(fixesDir, stem);
  if (fs.existsSync(fixDir)) {
    const segments = fs.readdirSync(fixDir).filter((entry) => fs.statSync(path.join(fixDir, entry)).isFile()).sort();
    if (segments.length) {
      return segments.map((entry) => fs.readFileSync(path.join(fixDir, entry), "utf8").trim()).join("");
    }
  }
  return fs.readFileSync(path.join(partsDir, name), "utf8").trim();
}

const encoded = partFiles.map(readPart).join("");
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
