import type {
  Phase5ArtifactComparison,
  Phase5RepairExecutionOutput,
  Phase5RepairRound,
  Phase5RepairLoopOutput,
  Phase5RepairWorkflowPlan,
  TaskTemplateSelection,
  VtkjsEvidenceSummary,
  VtkjsRepairCategory,
  VtkjsRepairOnceOutput,
} from "../contracts/research-contracts.js";
import { createStableId } from "./research-utils.js";
import { buildPhase5LocalWorkflowPlan, runPhase5ExecutionLoop, selectPhase5Template } from "./vtkjs-phase5.js";
import { buildVtkjsRenderVerifyPlan } from "./vtkjs-render-verify.js";
import fs from "node:fs";
import path from "node:path";

interface VtkjsRepairParams {
  goal: string;
  title?: string;
  abstract?: string;
  html?: string;
  script?: string;
  renderReport?: string;
  renderReportPath?: string;
  browserConsole?: string;
  browserConsolePath?: string;
  pageErrors?: string;
  pageErrorsPath?: string;
  comparisonRenderReport?: string;
  comparisonRenderReportPath?: string;
  comparisonBrowserConsole?: string;
  comparisonBrowserConsolePath?: string;
  comparisonPageErrors?: string;
  comparisonPageErrorsPath?: string;
  artifactRoot?: string;
  canvasSelector?: string;
  timeoutMs?: number;
  maxRounds?: number;
}

function readOptionalFile(filePath?: string) {
  if (!filePath?.trim()) {
    return undefined;
  }
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return undefined;
  }
  return fs.readFileSync(resolvedPath, "utf-8");
}

function resolveEvidence(params: VtkjsRepairParams) {
  return {
    renderReport: params.renderReport ?? readOptionalFile(params.renderReportPath),
    browserConsole: params.browserConsole ?? readOptionalFile(params.browserConsolePath),
    pageErrors: params.pageErrors ?? readOptionalFile(params.pageErrorsPath),
  };
}

function resolveComparisonEvidence(params: VtkjsRepairParams) {
  return {
    renderReport: params.comparisonRenderReport ?? readOptionalFile(params.comparisonRenderReportPath),
    browserConsole: params.comparisonBrowserConsole ?? readOptionalFile(params.comparisonBrowserConsolePath),
    pageErrors: params.comparisonPageErrors ?? readOptionalFile(params.comparisonPageErrorsPath),
  };
}

function getRunRoot(customPath?: string) {
  return path.resolve(customPath?.trim() || path.join(process.cwd(), ".research-runs"));
}

function buildDefaultRepairScript() {
  return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({
  background: [0.1, 0.12, 0.18],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

const source = vtk.Filters.Sources.vtkSphereSource.newInstance({
  radius: 0.5,
  thetaResolution: 32,
  phiResolution: 32,
});
const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
mapper.setInputConnection(source.getOutputPort());

const actor = vtk.Rendering.Core.vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();
`;
}

function ensureRuntimeScript(html?: string) {
  const source = html?.trim();
  if (!source) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>vtk.js Repair Retry</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="/node_modules/vtk.js/vtk.js"></script>
    <script type="module" src="./generated/app.js"></script>
  </body>
</html>
`;
  }
  if (source.includes("/node_modules/vtk.js/vtk.js") || source.includes("/node_modules/vtk.js/dist/vtk.js")) {
    return source;
  }
  return source.replace("</body>", '  <script src="/node_modules/vtk.js/vtk.js"></script>\n</body>');
}

function normalizeText(input?: string) {
  return input?.trim().toLowerCase() ?? "";
}

function safeJsonParse(input?: string) {
  if (!input?.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

export function summarizeVtkjsEvidence(
  label: string,
  evidence: ReturnType<typeof resolveEvidence>,
): VtkjsEvidenceSummary | undefined {
  const hasEvidence = Object.values(evidence).some((value) => Boolean(value?.trim()));
  if (!hasEvidence) {
    return undefined;
  }

  const reportJson = safeJsonParse(evidence.renderReport) as
    | { verdict?: string; canvasFound?: boolean; consoleErrorCount?: number; pageErrorCount?: number }
    | undefined;
  const consoleJson = safeJsonParse(evidence.browserConsole) as Array<{ type?: string }> | undefined;
  const pageErrorsJson = safeJsonParse(evidence.pageErrors) as Array<{ message?: string }> | undefined;
  const reportText = normalizeText(evidence.renderReport);
  const consoleText = normalizeText(evidence.browserConsole);
  const pageErrorText = normalizeText(evidence.pageErrors);

  const verdict =
    reportJson?.verdict === "accepted" || reportJson?.verdict === "needs_revision" || reportJson?.verdict === "planned"
      ? reportJson.verdict
      : reportText.includes('"verdict":"accepted"') || reportText.includes('"verdict": "accepted"')
        ? "accepted"
        : reportText.includes('"verdict":"needs_revision"') || reportText.includes('"verdict": "needs_revision"')
          ? "needs_revision"
          : reportText.includes('"verdict":"planned"') || reportText.includes('"verdict": "planned"')
            ? "planned"
            : "unknown";
  const canvasFound =
    typeof reportJson?.canvasFound === "boolean"
      ? reportJson.canvasFound
      : reportText.includes('"canvasfound":true') || reportText.includes('"canvasfound": true');
  const consoleErrorCount =
    typeof reportJson?.consoleErrorCount === "number"
      ? reportJson.consoleErrorCount
      : Array.isArray(consoleJson)
        ? consoleJson.filter((entry) => entry?.type === "error").length
        : consoleText.includes('"type":"error"') || consoleText.includes('"type": "error"')
          ? 1
          : 0;
  const pageErrorCount =
    typeof reportJson?.pageErrorCount === "number"
      ? reportJson.pageErrorCount
      : Array.isArray(pageErrorsJson)
        ? pageErrorsJson.length
        : pageErrorText.length > 0
          ? 1
          : 0;

  return {
    summaryId: createStableId("evidence", `${label}-${verdict}-${consoleErrorCount}-${pageErrorCount}`),
    label,
    verdict,
    canvasFound,
    consoleErrorCount,
    pageErrorCount,
    hasRuntimeReferenceIssue:
      consoleText.includes("vtk is not defined") || pageErrorText.includes("vtk is not defined"),
    evidenceSources: [
      ...(evidence.renderReport ? ["render-report"] : []),
      ...(evidence.browserConsole ? ["browser-console"] : []),
      ...(evidence.pageErrors ? ["page-errors"] : []),
    ],
  };
}

export function compareVtkjsEvidence(
  baseline: VtkjsEvidenceSummary,
  candidate: VtkjsEvidenceSummary,
): Phase5ArtifactComparison {
  const changes: string[] = [];
  if (baseline.verdict !== candidate.verdict) {
    changes.push(`Verdict changed from ${baseline.verdict} to ${candidate.verdict}.`);
  }
  if (baseline.canvasFound !== candidate.canvasFound) {
    changes.push(`Canvas visibility changed from ${baseline.canvasFound} to ${candidate.canvasFound}.`);
  }
  if (baseline.consoleErrorCount !== candidate.consoleErrorCount) {
    changes.push(
      `Console error count changed from ${baseline.consoleErrorCount} to ${candidate.consoleErrorCount}.`,
    );
  }
  if (baseline.pageErrorCount !== candidate.pageErrorCount) {
    changes.push(`Page error count changed from ${baseline.pageErrorCount} to ${candidate.pageErrorCount}.`);
  }
  if (baseline.hasRuntimeReferenceIssue !== candidate.hasRuntimeReferenceIssue) {
    changes.push(
      `Runtime reference issue changed from ${baseline.hasRuntimeReferenceIssue} to ${candidate.hasRuntimeReferenceIssue}.`,
    );
  }

  const improved =
    (candidate.verdict === "accepted" && baseline.verdict !== "accepted") ||
    (candidate.canvasFound && !baseline.canvasFound) ||
    candidate.consoleErrorCount < baseline.consoleErrorCount ||
    candidate.pageErrorCount < baseline.pageErrorCount ||
    (!candidate.hasRuntimeReferenceIssue && baseline.hasRuntimeReferenceIssue);

  return {
    comparisonId: createStableId("artifact-compare", `${baseline.summaryId}-${candidate.summaryId}`),
    baseline,
    candidate,
    improved,
    changes: changes.length > 0 ? changes : ["No material artifact differences were detected."],
  };
}

function classifyRepairCategory(params: VtkjsRepairParams): VtkjsRepairCategory {
  const evidence = resolveEvidence(params);
  const reportText = normalizeText(evidence.renderReport);
  const consoleText = normalizeText(evidence.browserConsole);
  const pageErrorText = normalizeText(evidence.pageErrors);
  const scriptText = normalizeText(params.script);
  const htmlText = normalizeText(params.html);

  if (
    consoleText.includes("vtk is not defined") ||
    pageErrorText.includes("vtk is not defined") ||
    (!htmlText.includes("/node_modules/vtk.js/vtk.js") &&
      !htmlText.includes("/node_modules/vtk.js/dist/vtk.js") &&
      htmlText.length > 0)
  ) {
    return "missing_vtk_runtime";
  }
  if (
    scriptText.length > 0 &&
    (!scriptText.includes("renderwindow.render") || !scriptText.includes("fullscreeenrenderwindow") && !scriptText.includes("fullscreenrenderwindow"))
  ) {
    return "missing_render_call";
  }
  if (reportText.includes('"canvasfound": false') || reportText.includes('"verdict": "needs_revision"')) {
    return "missing_canvas";
  }
  if (pageErrorText.length > 0) {
    return "page_runtime_error";
  }
  if (consoleText.includes('"type": "error"') || consoleText.includes("error")) {
    return "console_error";
  }
  return "unknown";
}

export function repairVtkjsOnce(params: VtkjsRepairParams): VtkjsRepairOnceOutput {
  const category = classifyRepairCategory(params);
  const evidence = resolveEvidence(params);
  const repairedScriptBase = params.script?.trim() || buildDefaultRepairScript();
  const findings: string[] = [];
  const rationale: string[] = [];
  const retryHints: string[] = [];
  let repairedHtml = params.html;
  let repairedScript = params.script;

  switch (category) {
    case "missing_vtk_runtime":
      findings.push("The current HTML or browser log indicates that the vtk.js runtime is missing in the page.");
      rationale.push("Browser rendering cannot start until `vtk` is available on `window` or imported into the module scope.");
      repairedHtml = ensureRuntimeScript(params.html);
      repairedScript = repairedScriptBase;
      retryHints.push("Retry with the vtk.js browser bundle injected before the module script.");
      break;
    case "missing_render_call":
      findings.push("The script does not look like it completes a full vtk.js render pipeline.");
      rationale.push("A valid verification retry should create the render window, connect the mapper input, and call `renderWindow.render()`. ");
      repairedHtml = ensureRuntimeScript(params.html);
      repairedScript = buildDefaultRepairScript();
      retryHints.push("Retry with a minimal full-screen render window pipeline before adding more scene complexity.");
      break;
    case "missing_canvas":
      findings.push("The verification report indicates that no canvas was detected after page load.");
      rationale.push("This usually means the render bootstrap did not complete, or the page never initialized the vtk.js surface.");
      repairedHtml = ensureRuntimeScript(params.html);
      repairedScript = buildDefaultRepairScript();
      retryHints.push("Retry with the minimal sphere scene and only reintroduce custom logic after canvas rendering succeeds.");
      break;
    case "page_runtime_error":
      findings.push("The page emitted at least one runtime exception during browser verification.");
      rationale.push("A runtime exception blocks render completion even when the HTML structure is otherwise valid.");
      repairedHtml = ensureRuntimeScript(params.html);
      repairedScript = buildDefaultRepairScript();
      retryHints.push("Inspect the page error log and retry with a smaller verified scene pipeline.");
      break;
    case "console_error":
      findings.push("The browser console contains error-level output that should be eliminated before retrying.");
      rationale.push("Console errors often expose missing assets, invalid API calls, or bad pipeline ordering.");
      repairedHtml = ensureRuntimeScript(params.html);
      repairedScript = repairedScriptBase.includes("renderWindow.render()")
        ? repairedScriptBase
        : buildDefaultRepairScript();
      retryHints.push("Retry after replacing fragile APIs with the minimal source -> mapper -> actor -> renderer path.");
      break;
    case "unknown":
    default:
      findings.push("The evidence does not match a known high-confidence vtk.js repair pattern.");
      rationale.push("Use a conservative retry that restores a known-good vtk.js browser bootstrap.");
      repairedHtml = ensureRuntimeScript(params.html);
      repairedScript = buildDefaultRepairScript();
      retryHints.push("Retry with the minimal verified scene and compare the new browser artifacts against the previous run.");
      break;
  }

  return {
    repairId: createStableId("repair", `${params.goal}-${category}`),
    category,
    shouldRetry: true,
    findings: [
      ...findings,
      ...(evidence.renderReport ? ["Render verification evidence was included in the repair decision."] : []),
      ...(evidence.browserConsole ? ["Browser console evidence was included in the repair decision."] : []),
      ...(evidence.pageErrors ? ["Page error evidence was included in the repair decision."] : []),
    ],
    rationale,
    repairedHtml,
    repairedScript,
    retryHints,
  };
}

export function runPhase5RepairLoop(params: VtkjsRepairParams): Phase5RepairLoopOutput {
  const selection: TaskTemplateSelection = selectPhase5Template({
    goal: params.goal,
    title: params.title ?? "Phase 5 Repair Retry",
    abstract: params.abstract ?? "Retry browser validation after applying a conservative vtk.js repair.",
    html: params.html,
    script: params.script,
    artifactRoot: params.artifactRoot,
    canvasSelector: params.canvasSelector,
    timeoutMs: params.timeoutMs,
  });
  const originalExecution = runPhase5ExecutionLoop({
    goal: params.goal,
    title: params.title ?? "Phase 5 Repair Retry",
    abstract: params.abstract ?? "Retry browser validation after applying a conservative vtk.js repair.",
    html: params.html,
    script: params.script,
    artifactRoot: params.artifactRoot,
    canvasSelector: params.canvasSelector,
    timeoutMs: params.timeoutMs,
  });
  const baselineEvidenceSummary = summarizeVtkjsEvidence("baseline", resolveEvidence(params));
  const comparisonEvidenceSummary = summarizeVtkjsEvidence("candidate", resolveComparisonEvidence(params));
  const maxRounds = Math.min(5, Math.max(1, params.maxRounds ?? 2));
  const rounds: Phase5RepairRound[] = [];
  const repair = repairVtkjsOnce(params);

  if (!repair.shouldRetry || selection.templateId !== "vtkjs_scene_validation") {
    return {
      selection,
      originalRouteKind: originalExecution.routeKind,
      maxRounds,
      evidenceSummary: baselineEvidenceSummary,
      artifactComparison:
        baselineEvidenceSummary && comparisonEvidenceSummary
          ? compareVtkjsEvidence(baselineEvidenceSummary, comparisonEvidenceSummary)
          : undefined,
      repair,
      rounds,
    };
  }

  const retryParams = {
    goal: params.goal,
    title: params.title ?? "Phase 5 Repair Retry",
    abstract: params.abstract ?? "Retry browser validation after applying a conservative vtk.js repair.",
    html: repair.repairedHtml,
    script: repair.repairedScript,
    artifactRoot: params.artifactRoot,
    canvasSelector: params.canvasSelector,
    timeoutMs: params.timeoutMs,
  };
  rounds.push({
    round: 1,
    repair,
    evidenceSummary: baselineEvidenceSummary,
    retryLocalWorkflowPlan: buildPhase5LocalWorkflowPlan(retryParams),
    retryRenderVerify: buildVtkjsRenderVerifyPlan(retryParams),
  });

  let currentHtml = repair.repairedHtml;
  let currentScript = repair.repairedScript;
  let previousSignature = `${currentHtml ?? ""}\n---\n${currentScript ?? ""}`;
  for (let round = 2; round <= maxRounds; round += 1) {
    const roundRepair = repairVtkjsOnce({
      goal: params.goal,
      title: params.title,
      abstract: params.abstract,
      html: currentHtml,
      script: currentScript,
      artifactRoot: params.artifactRoot,
      canvasSelector: params.canvasSelector,
      timeoutMs: params.timeoutMs,
    });
    const nextParams = {
      goal: params.goal,
      title: params.title ?? "Phase 5 Repair Retry",
      abstract: params.abstract ?? "Retry browser validation after applying a conservative vtk.js repair.",
      html: roundRepair.repairedHtml,
      script: roundRepair.repairedScript,
      artifactRoot: params.artifactRoot,
      canvasSelector: params.canvasSelector,
      timeoutMs: params.timeoutMs,
    };
    const signature = `${nextParams.html ?? ""}\n---\n${nextParams.script ?? ""}`;
    rounds.push({
      round,
      repair: roundRepair,
      retryLocalWorkflowPlan: buildPhase5LocalWorkflowPlan(nextParams),
      retryRenderVerify: buildVtkjsRenderVerifyPlan(nextParams),
    });
    if (!roundRepair.shouldRetry || signature === previousSignature) {
      break;
    }
    currentHtml = roundRepair.repairedHtml;
    currentScript = roundRepair.repairedScript;
    previousSignature = signature;
  }

  const firstRound = rounds[0];

  return {
    selection,
    originalRouteKind: originalExecution.routeKind,
    maxRounds,
    evidenceSummary: baselineEvidenceSummary,
    artifactComparison:
      baselineEvidenceSummary && comparisonEvidenceSummary
        ? compareVtkjsEvidence(baselineEvidenceSummary, comparisonEvidenceSummary)
        : undefined,
    repair,
    rounds,
    retryLocalWorkflowPlan: firstRound?.retryLocalWorkflowPlan,
    retryRenderVerify: firstRound?.retryRenderVerify,
  };
}

export function buildPhase5RepairWorkflowPlan(params: VtkjsRepairParams): Phase5RepairWorkflowPlan {
  const maxRounds = Math.min(5, Math.max(1, params.maxRounds ?? 2));
  const workflowId = createStableId("phase5-repair-workflow", `${params.goal}-${maxRounds}`);
  const runRoot = path.join(getRunRoot(params.artifactRoot), "phase5-repair-workflow-inputs");
  fs.mkdirSync(runRoot, { recursive: true });
  const inputPath = path.join(runRoot, `${workflowId}.json`);
  fs.writeFileSync(
    inputPath,
    `${JSON.stringify(
      {
        goal: params.goal,
        title: params.title,
        abstract: params.abstract,
        html: params.html,
        script: params.script,
        renderReport: params.renderReport,
        renderReportPath: params.renderReportPath,
        browserConsole: params.browserConsole,
        browserConsolePath: params.browserConsolePath,
        pageErrors: params.pageErrors,
        pageErrorsPath: params.pageErrorsPath,
        artifactRoot: params.artifactRoot,
        canvasSelector: params.canvasSelector,
        timeoutMs: params.timeoutMs,
        maxRounds,
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );

  return {
    workflowId,
    inputPath,
    shellCommand: ["pnpm", "phase5:repair-workflow", "--", "--input", inputPath].join(" "),
    maxRounds,
    expectedOutputs: [
      "docker-result.json",
      "workspace/artifacts/render-verification.json",
      "workspace/artifacts/browser-console.json",
      "workspace/artifacts/page-errors.json",
      "workspace/artifacts/render-screenshot.png",
      "phase5-repair-workflow-result.json",
    ],
  };
}
