const fs = require("fs");
const path = require("path");

const root = process.cwd();

function replaceRequired(filePath, before, after, label) {
  const absolutePath = path.join(root, filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`[preview-ui-hotfix] Missing file for ${label}: ${filePath}`);
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  if (!source.includes(before)) {
    if (source.includes(after)) return;
    throw new Error(`[preview-ui-hotfix] Expected source pattern not found for ${label}`);
  }

  fs.writeFileSync(absolutePath, source.replace(before, after), "utf8");
}

const discoveryFile = "components/onboarding/contextual-feature-discovery-client.tsx";
replaceRequired(
  discoveryFile,
  'className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-l from-indigo-50/80 via-white to-violet-50/60 p-4 shadow-sm sm:p-5"',
  'className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-l from-indigo-50/80 via-white to-violet-50/60 p-4 shadow-sm sm:p-5 dark:border-indigo-900/70 dark:from-indigo-950/60 dark:via-slate-950 dark:to-violet-950/40"',
  "feature discovery dark container",
);
replaceRequired(
  discoveryFile,
  'className="flex flex-wrap items-center gap-2 text-[10px] font-black text-indigo-600"',
  'className="flex flex-wrap items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-300"',
  "feature discovery dark eyebrow",
);
replaceRequired(
  discoveryFile,
  'className="mt-1 text-sm font-black text-slate-900"',
  'className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50"',
  "feature discovery dark title",
);
replaceRequired(
  discoveryFile,
  'className="mt-1 max-w-3xl text-[11px] font-semibold leading-5 text-slate-500"',
  'className="mt-1 max-w-3xl text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-300"',
  "feature discovery dark description",
);
replaceRequired(
  discoveryFile,
  'className="mt-3 inline-flex min-h-9 items-center rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-[11px] font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"',
  'className="mt-3 inline-flex min-h-9 items-center rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-[11px] font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950/60"',
  "feature discovery dark action",
);
replaceRequired(
  discoveryFile,
  'className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"',
  'className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"',
  "feature discovery dark dismiss",
);

replaceRequired(
  "components/help/contextual-help.tsx",
  'className="fixed bottom-[92px] left-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-200 bg-white text-teal-700 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-teal-50 lg:bottom-5 lg:left-5 dark:border-teal-900 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-teal-950/50"',
  'className="fixed bottom-[92px] right-4 z-[57] flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-200 bg-white text-teal-700 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-teal-50 lg:bottom-6 lg:left-44 lg:right-auto dark:border-teal-900 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-teal-950/50"',
  "contextual help responsive position",
);

// Next.js 15 enforces that runtime exports from a `use server` module are async functions only.
// Keep the action state type in the server module, but move the initial state object into the client module.
replaceRequired(
  "app/admin/tutorial-videos/actions.ts",
  'export const INITIAL_TUTORIAL_VIDEO_ACTION_STATE: TutorialVideoActionState = { success: false };\n\n',
  '',
  "tutorial video server action runtime export",
);
replaceRequired(
  "app/admin/tutorial-videos/_tutorial-video-management.tsx",
  'import {\n  adminSaveTutorialVideoAction,\n  INITIAL_TUTORIAL_VIDEO_ACTION_STATE,\n  type TutorialVideoActionState,\n} from "./actions";\n',
  'import { adminSaveTutorialVideoAction, type TutorialVideoActionState } from "./actions";\n\nconst INITIAL_TUTORIAL_VIDEO_ACTION_STATE: TutorialVideoActionState = { success: false };\n',
  "tutorial video client initial action state",
);

console.log("[preview-ui-hotfix] Applied QA UI fixes and tutorial video server-action export fix.");
