const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const root = process.cwd();
const overlayRoot = path.join(root, ".preview-overlay");
const partsDir = path.join(overlayRoot, "parts");
const fixesRoot = path.join(overlayRoot, "fixes");
const expectedFixSha256 = {
  "008.b64part": "b52b7449bac6ebcde77a0d3e511aeb556120585233482232ee8d7e2d25e2533a",
  "010.b64part": "987d37fa907f884f24323e73436701f7163a2949e9306c21f472907569398c89",
  "020.b64part": "6471453128163237e66ea7f27da0d1c056633e973d0a6fdc15a9b3ada9ac2c60",
};

const partFiles = fs.readdirSync(partsDir).filter((name) => name.endsWith(".b64part")).sort();
if (!partFiles.length) throw new Error("Preview overlay parts are missing.");

function readPart(name) {
  const base = name.replace(/\.b64part$/, "");
  const fixDir = path.join(fixesRoot, base);
  if (!fs.existsSync(fixDir)) return fs.readFileSync(path.join(partsDir, name), "utf8").trim();
  const segments = fs.readdirSync(fixDir).sort();
  if (!segments.length) throw new Error(`Preview overlay fix is empty: ${name}`);
  const value = segments.map((segment) => fs.readFileSync(path.join(fixDir, segment), "utf8")).join("").trim();
  const expected = expectedFixSha256[name];
  if (expected) {
    const actual = crypto.createHash("sha256").update(value, "utf8").digest("hex");
    if (actual !== expected) throw new Error(`Preview overlay fix checksum mismatch: ${name}`);
  }
  console.log(`[preview-overlay] Using verified repair for ${name}.`);
  return value;
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
