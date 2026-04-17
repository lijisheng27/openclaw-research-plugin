#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
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
  pnpm vtkjs:eval-runner
  pnpm vtkjs:eval-runner -- --cases slice,volume,streamline,mag_iso
  pnpm vtkjs:eval-runner -- --artifactRoot C:\\path\\to\\runs

This runner:
1. Builds the current vtk.js benchmark workflow set
2. Executes each case through the Phase 5 local workflow
3. Reads browser evidence from produced artifacts
4. Summarizes execution-backed benchmark scores`);
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  const raw = readText(filePath);
  return raw ? JSON.parse(raw) : undefined;
}

function summarizeExecutionChecks(params) {
  const checks = [
    {
      name: "docker-exit-code",
      passed: params.dockerExitCode === 0,
      detail: `Expected Docker exit code 0, got ${params.dockerExitCode}.`,
    },
    {
      name: "docker-status",
      passed: params.dockerStatus === "passed",
      detail: `Docker status: ${params.dockerStatus ?? "unknown"}.`,
    },
    {
      name: "render-verdict",
      passed: params.renderVerdict === "accepted",
      detail: `Render verdict: ${params.renderVerdict ?? "unknown"}.`,
    },
    {
      name: "console-errors",
      passed: (params.consoleErrorCount ?? 999) === 0,
      detail: `Console error count: ${params.consoleErrorCount ?? "unknown"}.`,
    },
    {
      name: "page-errors",
      passed: (params.pageErrorCount ?? 999) === 0,
      detail: `Page error count: ${params.pageErrorCount ?? "unknown"}.`,
    },
  ];
  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    checks,
    score,
    status: score === 100 ? "accepted" : "needs_revision",
  };
}

const args = parseArgs(process.argv.slice(2).filter((arg) => arg !== "--"));
if (args.help === "true" || args.h === "true") {
  usage();
  process.exit(0);
}

const caseIds = args.cases
  ? args.cases
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  : undefined;

const evalModule = await import("../dist/src/services/vtkjs-eval.js");
const runnerOutput = evalModule.runVtkjsEvalRunner({
  caseIds,
  artifactRoot: args.artifactRoot,
});

const executedCases = [];

for (const item of runnerOutput.cases) {
  const workflowInputPath = item.workflow.inputPath;
  const workflowRunner = spawnSync("node", ["scripts/run-phase5-local-workflow.mjs", "--input", workflowInputPath], {
    cwd: process.cwd(),
    encoding: "utf-8",
  });

  let workflowOutput;
  try {
    workflowOutput = workflowRunner.stdout?.trim() ? JSON.parse(workflowRunner.stdout) : undefined;
  } catch {
    workflowOutput = undefined;
  }

  const manifestPath =
    workflowOutput?.routeKind === "vtkjs_render_verify"
      ? workflowOutput.route?.manifest?.manifestPath
      : workflowOutput?.route?.manifest?.manifestPath;
  const runDir = manifestPath ? path.dirname(manifestPath) : undefined;
  const artifactsDir = runDir ? path.join(runDir, "workspace", "artifacts") : undefined;
  const renderReport = artifactsDir ? readJson(path.join(artifactsDir, "render-verification.json")) : undefined;

  const { checks, score, status } = summarizeExecutionChecks({
    dockerExitCode: workflowRunner.status ?? 1,
    dockerStatus: workflowOutput?.dockerRunner?.result?.status,
    renderVerdict: renderReport?.verdict,
    consoleErrorCount: renderReport?.consoleErrorCount,
    pageErrorCount: renderReport?.pageErrorCount,
  });

  executedCases.push({
    caseId: item.caseId,
    title: item.title,
    workflow: item.workflow,
    dockerExitCode: workflowRunner.status ?? 1,
    dockerStatus: workflowOutput?.dockerRunner?.result?.status,
    renderVerdict: renderReport?.verdict ?? "unknown",
    consoleErrorCount: renderReport?.consoleErrorCount,
    pageErrorCount: renderReport?.pageErrorCount,
    score,
    status,
    checks,
  });
}

const acceptedCases = executedCases.filter((item) => item.status === "accepted").length;
const totalCases = executedCases.length;
const averageScore =
  totalCases > 0 ? Math.round(executedCases.reduce((sum, item) => sum + item.score, 0) / totalCases) : 0;

const output = {
  runId: runnerOutput.runId,
  requestedCases: runnerOutput.requestedCases,
  totalCases,
  acceptedCases,
  averageScore,
  cases: executedCases,
  nextActions: [
    "Inspect any benchmark case with failed execution-backed checks before trusting the generator.",
    "Promote scaffold scenes to richer task logic only after the execution-backed baseline stays green.",
    "Use the produced workflow inputs and artifacts as the seed for later experiment tables.",
  ],
};

const resultPath = path.join(process.cwd(), "vtkjs-eval-runner-result.json");
fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
console.log(JSON.stringify(output, null, 2));
process.exit(acceptedCases === totalCases ? 0 : 1);
