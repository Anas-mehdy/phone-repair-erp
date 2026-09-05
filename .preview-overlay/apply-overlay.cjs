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

// TypeScript cannot infer that shouldEnterOnboarding(profile) excludes null because the helper is not a type predicate.
// Keep runtime behavior identical while making the non-null guard explicit for the compiler.
const onboardingPagePath = path.join(root, "app/onboarding/page.tsx");
if (fs.existsSync(onboardingPagePath)) {
  let source = fs.readFileSync(onboardingPagePath, "utf8");
  const before = 'if (!shouldEnterOnboarding(profile)) redirect("/dashboard");';
  const after = 'if (!profile || !shouldEnterOnboarding(profile)) redirect("/dashboard");';
  if (source.includes(before)) {
    source = source.replace(before, after);
    fs.writeFileSync(onboardingPagePath, source, "utf8");
    console.log("[preview-overlay] Applied explicit onboarding profile null guard.");
  }
}

// The current PWA is intentionally online-only. A pass-through fetch handler adds no caching benefit and
// turns transient network rejections into noisy Service Worker errors. Leave install/activate behavior intact
// and let the browser perform normal network requests directly.
const serviceWorkerPath = path.join(root, "public/sw.js");
if (fs.existsSync(serviceWorkerPath)) {
  let source = fs.readFileSync(serviceWorkerPath, "utf8");
  const fetchHandler = `\nself.addEventListener("fetch", (event) => {\n  const request = event.request;\n  if (request.method !== "GET") return;\n\n  const url = new URL(request.url);\n  if (url.origin !== self.location.origin) return;\n\n  // Online-first by design: do not cache pages, API responses, or user data.\n  // Every navigation continues to read the latest deployed web application.\n  event.respondWith(fetch(request));\n});\n`;
  if (source.includes(fetchHandler)) {
    source = source.replace(fetchHandler, "\n");
    fs.writeFileSync(serviceWorkerPath, source, "utf8");
    console.log("[preview-overlay] Removed redundant online-only Service Worker fetch interception.");
  }
}

console.log(`[preview-overlay] Applied ${count} Release Candidate files.`);
