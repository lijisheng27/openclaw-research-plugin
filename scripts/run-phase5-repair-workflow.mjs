#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, ""));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function usage() {
  console.log(`Usage:
  pnpm phase5:repair-workflow -- --input <workflow-input.json>
  pnpm phase5:repair-workflow -- --goal "..." --renderReportPath "..."

This runner performs the executed Phase 5 repair workflow:
1. Read current failure evidence
2. Plan the next repair retry
3. Execute the retry manifest through the Docker runner
4. Re-ingest produced artifacts and decide whether another round is needed`);
}

function loadInput(args) {
  if (args.help === "true" || args.h === "true") {
    usage();
    process.exit(0);
  }
  if (args.input) {
    const inputPath = path.resolve(args.input);
    if (!fs.existsSync(inputPath)) {
      fail(`Workflow input not found: ${inputPath}`);
    }
    return { inputPath, payload: readJsonFile(inputPath) };
  }
  if (!args.goal) {
    usage();
    fail("Missing required arguments. Provide --input or at least --goal.");
  }
  return {
    inputPath: undefined,
    payload: {
      goal: args.goal,
      title: args.title,
      abstract: args.abstract,
      html: args.html,
      script: args.script,
      renderReport: args.renderReport,
      renderReportPath: args.renderReportPath,
      browserConsole: args.browserConsole,
      browserConsolePath: args.browserConsolePath,
      pageErrors: args.pageErrors,
      pageErrorsPath: args.pageErrorsPath,
      artifactRoot: args.artifactRoot,
      canvasSelector: args.canvasSelector,
      timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
      maxRounds: args.maxRounds ? Number(args.maxRounds) : undefined,
    },
  };
}

function readOptionalFile(filePath) {
  if (!filePath) {
    return undefined;
  }
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return undefined;
  }
  return fs.readFileSync(resolvedPath, "utf-8");
}

function collectEvidenceFromManifest(manifestPath) {
  const runDir = path.dirname(manifestPath);
  const artifactsDir = path.join(runDir, "workspace", "artifacts");
  const renderReportPath = path.join(artifactsDir, "render-verification.json");
  const browserConsolePath = path.join(artifactsDir, "browser-console.json");
  const pageErrorsPath = path.join(artifactsDir, "page-errors.json");
  return {
    renderReportPath,
    browserConsolePath,
    pageErrorsPath,
    renderReport: readOptionalFile(renderReportPath),
    browserConsole: readOptionalFile(browserConsolePath),
    pageErrors: readOptionalFile(pageErrorsPath),
  };
}

const args = parseArgs(process.argv.slice(2).filter((arg) => arg !== "--"));
const { inputPath, payload } = loadInput(args);

const repairModule = await import("../dist/src/services/vtkjs-repair.js");
const workflow = repairModule.buildPhase5RepairWorkflowPlan(payload);
const maxRounds = workflow.maxRounds;

let currentPayload = { ...payload };
let previousEvidenceSummary = repairModule.summarizeVtkjsEvidence("baseline", {
  renderReport: currentPayload.renderReport ?? readOptionalFile(currentPayload.renderReportPath),
  browserConsole: currentPayload.browserConsole ?? readOptionalFile(currentPayload.browserConsolePath),
  pageErrors: currentPayload.pageErrors ?? readOptionalFile(currentPayload.pageErrorsPath),
});

const executedRounds = [];
let finalStatus = "stopped";
let finalEvidenceSummary = previousEvidenceSummary;

for (let round = 1; round <= maxRounds; round += 1) {
  const plan = repairModule.runPhase5RepairLoop({
    ...currentPayload,
    maxRounds: 1,
  });

  const retry = plan.retryRenderVerify;
  if (!retry?.manifest?.manifestPath) {
    executedRounds.push({
      round,
      category: plan.repair.category,
      stopReason: "Repair loop did not produce a retry manifest.",
    });
    finalStatus = "stopped";
    break;
  }

  const dockerRunner = spawnSync("node", ["scripts/run-docker-sandbox.mjs", retry.manifest.manifestPath], {
    cwd: process.cwd(),
    encoding: "utf-8",
  });
  const dockerResultPath = path.join(path.dirname(retry.manifest.manifestPath), "docker-result.json");
  const dockerResult = fs.existsSync(dockerResultPath)
    ? readJsonFile(dockerResultPath)
    : undefined;
  const evidence = collectEvidenceFromManifest(retry.manifest.manifestPath);
  const evidenceSummary = repairModule.summarizeVtkjsEvidence(`round-${round}`, evidence);
  const artifactComparison =
    previousEvidenceSummary && evidenceSummary
      ? repairModule.compareVtkjsEvidence(previousEvidenceSummary, evidenceSummary)
      : undefined;

  let stopReason;
  if (evidenceSummary?.verdict === "accepted") {
    finalStatus = "accepted";
    stopReason = "Retry produced an accepted verification verdict.";
  } else if (artifactComparison && !artifactComparison.improved) {
    finalStatus = "stopped";
    stopReason = "Latest retry did not improve the available browser evidence.";
  } else if ((dockerRunner.status ?? 1) !== 0) {
    finalStatus = "needs_revision";
    stopReason = "Docker runner failed for the latest retry.";
  } else {
    finalStatus = "needs_revision";
  }

  executedRounds.push({
    round,
    category: plan.repair.category,
    manifestPath: retry.manifest.manifestPath,
    dockerExitCode: dockerRunner.status ?? 1,
    dockerStatus: dockerResult?.status,
    evidenceSummary,
    artifactComparison,
    stopReason,
  });

  finalEvidenceSummary = evidenceSummary ?? finalEvidenceSummary;

  if (stopReason) {
    break;
  }

  currentPayload = {
    ...currentPayload,
    html: plan.repair.repairedHtml,
    script: plan.repair.repairedScript,
    renderReportPath: evidence.renderReportPath,
    browserConsolePath: evidence.browserConsolePath,
    pageErrorsPath: evidence.pageErrorsPath,
    renderReport: undefined,
    browserConsole: undefined,
    pageErrors: undefined,
  };
  previousEvidenceSummary = evidenceSummary ?? previousEvidenceSummary;
}

const output = {
  workflow,
  maxRounds,
  executedRounds,
  finalStatus,
  finalEvidenceSummary,
};

const resultPath = inputPath
  ? path.join(path.dirname(path.resolve(inputPath)), "phase5-repair-workflow-result.json")
  : path.join(process.cwd(), "phase5-repair-workflow-result.json");
fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");

console.log(JSON.stringify(output, null, 2));
process.exit(finalStatus === "accepted" ? 0 : 1);
