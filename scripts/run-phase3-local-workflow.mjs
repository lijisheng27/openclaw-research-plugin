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
  pnpm phase3:local-workflow -- --input <workflow-input.json>
  pnpm phase3:local-workflow -- --goal "..." --title "..." --abstract "..."

This runner performs the complete Phase 3 local workflow:
1. Generate the plugin validation payload and Docker manifest
2. Execute the generated manifest through the local Docker runner
3. Emit a combined workflow result`);
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
    return readJsonFile(inputPath);
  }
  if (!args.goal || !args.title || !args.abstract) {
    usage();
    fail("Missing required arguments. Provide --input or --goal/--title/--abstract.");
  }
  return {
    goal: args.goal,
    title: args.title,
    abstract: args.abstract,
    body: args.body,
    code: args.code,
    codeLanguage: args.codeLanguage,
    artifactRoot: args.artifactRoot,
    environmentProfile: args.environmentProfile,
    requestedRuntime: args.requestedRuntime ?? "docker",
  };
}

const args = parseArgs(process.argv.slice(2).filter((arg) => arg !== "--"));
const input = loadInput(args);

const serviceModule = await import("../dist/src/services/research-validation.js");
const phase3 = serviceModule.runPhase3ValidationLoop(input);
const manifestPath = phase3.manifest.manifestPath;
const dockerRunner = spawnSync("node", ["scripts/run-docker-sandbox.mjs", manifestPath], {
  cwd: process.cwd(),
  encoding: "utf-8",
});

let dockerResult = null;
const dockerResultPath = path.join(path.dirname(manifestPath), "docker-result.json");
if (fs.existsSync(dockerResultPath)) {
  dockerResult = readJsonFile(dockerResultPath);
}

const output = {
  workflow: phase3.localWorkflowPlan,
  validation: phase3,
  dockerRunner: {
    exitCode: dockerRunner.status ?? 1,
    stdout: dockerRunner.stdout?.split(/\r?\n/).filter(Boolean) ?? [],
    stderr: dockerRunner.stderr?.split(/\r?\n/).filter(Boolean) ?? [],
    result: dockerResult,
  },
};

console.log(JSON.stringify(output, null, 2));
process.exit(dockerRunner.status ?? 1);
