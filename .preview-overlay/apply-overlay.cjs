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

// Preview-only release-candidate hotfix discovered by the first full Vercel build.
// Next.js requires Link for internal navigation; keep the staged source behavior unchanged otherwise.
const onboardingTransferPath = path.join(root, "app/transfers/_onboarding-transfer-form.tsx");
if (fs.existsSync(onboardingTransferPath)) {
  let source = fs.readFileSync(onboardingTransferPath, "utf8");
  if (source.includes('<a href="/transfers"')) {
    if (!source.includes('from "next/link"')) {
      source = source.replace(
        'import { useFormStatus } from "react-dom";\n',
        'import { useFormStatus } from "react-dom";\nimport Link from "next/link";\n',
      );
    }
    source = source.replace(
      '<a href="/transfers" className="block text-center text-[10px] font-black text-slate-400 hover:text-teal-700">استخدام نموذج التحويلات الكامل بدلاً من ذلك</a>',
      '<Link href="/transfers" className="block text-center text-[10px] font-black text-slate-400 hover:text-teal-700">استخدام نموذج التحويلات الكامل بدلاً من ذلك</Link>',
    );
    fs.writeFileSync(onboardingTransferPath, source, "utf8");
    console.log("[preview-overlay] Applied Next.js Link hotfix for onboarding transfer form.");
  }
}

console.log(`[preview-overlay] Applied ${count} Release Candidate files.`);
