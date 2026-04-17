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
  pnpm vtkjs:corpus-update -- --corpusRoot C:\\path\\to\\knowledge\\vtkjs --track prompt-sample --slug rendering-sphere-baseline --renderReportPath C:\\path\\to\\render-verification.json
  pnpm vtkjs:corpus-update -- --entryDirectory C:\\path\\to\\knowledge\\vtkjs\\benchmark\\slice --renderReportPath C:\\path\\to\\render-verification.json --browserConsolePath C:\\path\\to\\browser-console.json --pageErrorsPath C:\\path\\to\\page-errors.json

This runner:
1. Loads one stored corpus entry
2. Writes validation evidence and comparison summaries back into the entry
3. Generates a repair proposal plus next workflow input when the evidence needs revision
4. Promotes accepted retries into stable corpus files when possible`);
}

function parseBoolean(input, defaultValue) {
  if (input === undefined) {
    return defaultValue;
  }
  return !["false", "0", "no"].includes(String(input).toLowerCase());
}

function parseOptionalBoolean(input, defaultValue) {
  if (input === undefined) {
    return undefined;
  }
  return parseBoolean(input, defaultValue);
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

const output = corpusModule.updateVtkjsCorpusEntry({
  corpusRoot: args.corpusRoot,
  manifestPath: args.manifestPath,
  track: args.track,
  slug: args.slug,
  entryDirectory: args.entryDirectory,
  renderReport: args.renderReport,
  renderReportPath: args.renderReportPath,
  renderScreenshotPath: args.renderScreenshotPath,
  dockerResultPath: args.dockerResultPath,
  browserConsole: args.browserConsole,
  browserConsolePath: args.browserConsolePath,
  pageErrors: args.pageErrors,
  pageErrorsPath: args.pageErrorsPath,
  comparisonRenderReport: args.comparisonRenderReport,
  comparisonRenderReportPath: args.comparisonRenderReportPath,
  comparisonRenderScreenshotPath: args.comparisonRenderScreenshotPath,
  comparisonBrowserConsole: args.comparisonBrowserConsole,
  comparisonBrowserConsolePath: args.comparisonBrowserConsolePath,
  comparisonPageErrors: args.comparisonPageErrors,
  comparisonPageErrorsPath: args.comparisonPageErrorsPath,
  includeRepair: parseOptionalBoolean(args.includeRepair, true),
  copyEvidence: parseOptionalBoolean(args.copyEvidence, true),
  promoteAcceptedRetry: parseOptionalBoolean(args.promoteAcceptedRetry, true),
});

console.log(JSON.stringify(output, null, 2));
process.exit(0);
