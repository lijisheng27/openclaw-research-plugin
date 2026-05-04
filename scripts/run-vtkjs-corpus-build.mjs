#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

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
  pnpm vtkjs:corpus-build
  pnpm vtkjs:corpus-build -- --outputRoot C:\\path\\to\\knowledge\\vtkjs
  pnpm vtkjs:corpus-build -- --artifactRoot C:\\path\\to\\artifact-root
  pnpm vtkjs:corpus-build -- --includeBenchmark false

This runner:
1. Builds a vtk.js corpus seed with prompt-sample, prompt-sample-pro, and benchmark entries
2. Writes replayable Phase 5 workflow inputs for stored corpus items
3. Emits a corpus manifest and rebuilding guide`);
}

function parseBoolean(input, defaultValue = true) {
  if (input === undefined) {
    return defaultValue;
  }
  return !["false", "0", "no"].includes(String(input).toLowerCase());
}

const args = parseArgs(process.argv.slice(2).filter((arg) => arg !== "--"));
if (args.help === "true" || args.h === "true") {
  usage();
  process.exit(0);
}

const modulePath = path.join(process.cwd(), "dist", "src", "services", "vtkjs-corpus.js");
let corpusModule;
try {
  corpusModule = await import(pathToFileURL(modulePath).href);
} catch (error) {
  fail(`Failed to import ${modulePath}. Run pnpm build first.\n${error}`);
}

const output = corpusModule.buildVtkjsCorpus({
  outputRoot: args.outputRoot,
  artifactRoot: args.artifactRoot,
  includePromptSample: parseBoolean(args.includePromptSample, true),
  includePromptSamplePro: parseBoolean(args.includePromptSamplePro, true),
  includeBenchmark: parseBoolean(args.includeBenchmark, true),
});

console.log(JSON.stringify(output, null, 2));
process.exit(0);
