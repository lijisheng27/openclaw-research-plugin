#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage:
  pnpm docker:sandbox -- <path-to-sandbox-manifest.json>
  node scripts/run-docker-sandbox.mjs <path-to-sandbox-manifest.json>

This runner executes a manifest emitted by the OpenClaw research plugin.
It intentionally lives outside plugin production code so OpenClaw's plugin
safety scanner does not need to allow shell execution inside the plugin host.`);
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf-8");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function collectFilesRecursively(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  const files = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursively(entryPath));
      continue;
    }
    files.push(entryPath);
  }
  return files;
}

function readManifest(rawPath) {
  const manifestPath = path.resolve(rawPath);
  if (!fs.existsSync(manifestPath)) {
    fail(`Manifest not found: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (!manifest || typeof manifest !== "object") {
    fail(`Manifest is not an object: ${manifestPath}`);
  }
  if (!Array.isArray(manifest.command) || manifest.command.length === 0) {
    fail("Manifest command must be a non-empty array.");
  }
  if (typeof manifest.image !== "string" || manifest.image.trim() === "") {
    fail("Manifest image must be a non-empty string.");
  }
  if (typeof manifest.workingDirectory !== "string" || manifest.workingDirectory.trim() === "") {
    fail("Manifest workingDirectory must be a non-empty string.");
  }
  if (typeof manifest.buildContextDir !== "string" || manifest.buildContextDir.trim() === "") {
    fail("Manifest buildContextDir must be a non-empty string.");
  }
  if (typeof manifest.imageTag !== "string" || manifest.imageTag.trim() === "") {
    fail("Manifest imageTag must be a non-empty string.");
  }
  return { manifestPath, manifest };
}

function ensureDockerAvailable() {
  const probe = spawnSync("docker", ["--version"], { encoding: "utf-8" });
  if (probe.status !== 0) {
    fail(
      [
        "Docker is not available from this terminal.",
        "Please install/start Docker Desktop, then run this command again.",
        probe.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function ensureDockerDaemonAvailable(runDir) {
  const probe = spawnSync("docker", ["info"], { encoding: "utf-8" });
  if (probe.status === 0) {
    return;
  }
  writeText(path.join(runDir, "docker-daemon.stdout.log"), probe.stdout ?? "");
  writeText(path.join(runDir, "docker-daemon.stderr.log"), probe.stderr ?? "");
  const result = {
    status: "failed",
    phase: "daemon",
    message: "Docker CLI is installed, but the Docker daemon is not reachable.",
    hint: "Start Docker Desktop or the Docker service, then rerun the workflow command.",
    exitCode: probe.status ?? 1,
    stdoutPath: path.join(runDir, "docker-daemon.stdout.log"),
    stderrPath: path.join(runDir, "docker-daemon.stderr.log"),
  };
  writeJson(path.join(runDir, "docker-result.json"), result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(probe.status ?? 1);
}

function collectKnownArtifacts(runDir, workspaceDir) {
  const artifacts = [];
  const stdoutLog = path.join(runDir, "stdout.log");
  const stderrLog = path.join(runDir, "stderr.log");
  for (const [kind, filePath, summary] of [
    ["stdout", stdoutLog, "Docker stdout log"],
    ["stderr", stderrLog, "Docker stderr log"],
  ]) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    artifacts.push({
      kind,
      path: path.relative(runDir, filePath).replaceAll("\\", "/"),
      summary,
      sha256: sha256File(filePath),
    });
  }
  for (const filePath of collectFilesRecursively(path.join(workspaceDir, "artifacts"))) {
    artifacts.push({
      kind: "report",
      path: path.relative(runDir, filePath).replaceAll("\\", "/"),
      summary: `Workspace artifact ${path.basename(filePath)}`,
      sha256: sha256File(filePath),
    });
  }
  return artifacts;
}

const args = process.argv.slice(2).filter((arg) => arg !== "--");
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(args.length === 0 ? 1 : 0);
}

const { manifestPath, manifest } = readManifest(args[0]);
const runDir = path.dirname(manifestPath);
const workspaceDir = path.resolve(manifest.workingDirectory);
const buildContextDir = path.resolve(manifest.buildContextDir);
if (!fs.existsSync(workspaceDir)) {
  fail(`Manifest workingDirectory does not exist: ${workspaceDir}`);
}
if (!fs.existsSync(buildContextDir)) {
  fail(`Manifest buildContextDir does not exist: ${buildContextDir}`);
}

ensureDockerAvailable();
ensureDockerDaemonAvailable(runDir);

const dockerBuildArgs = ["build", "-t", manifest.imageTag, buildContextDir];
const buildStartedAt = new Date().toISOString();
const buildResult = spawnSync("docker", dockerBuildArgs, {
  encoding: "utf-8",
  cwd: runDir,
});
const buildCompletedAt = new Date().toISOString();
if ((buildResult.status ?? 1) !== 0) {
  writeText(path.join(runDir, "docker-build.stdout.log"), buildResult.stdout ?? "");
  writeText(path.join(runDir, "docker-build.stderr.log"), buildResult.stderr ?? "");
  const failure = {
    runId: manifest.runId,
    manifestId: manifest.manifestId,
    manifestPath,
    startedAt: buildStartedAt,
    completedAt: buildCompletedAt,
    dockerBuildCommand: ["docker", ...dockerBuildArgs],
    status: "failed",
    phase: "build",
    exitCode: buildResult.status ?? 1,
    stdoutPath: path.join(runDir, "docker-build.stdout.log"),
    stderrPath: path.join(runDir, "docker-build.stderr.log"),
    artifacts: collectKnownArtifacts(runDir, workspaceDir),
  };
  writeJson(path.join(runDir, "docker-result.json"), failure);
  console.log(JSON.stringify(failure, null, 2));
  process.exit(buildResult.status ?? 1);
}

const dockerArgs = [
  "run",
  "--rm",
  "-v",
  `${workspaceDir}:/workspace`,
  "-w",
  "/workspace",
  manifest.imageTag,
  ...manifest.command,
];

const startedAt = new Date().toISOString();
const result = spawnSync("docker", dockerArgs, {
  encoding: "utf-8",
  cwd: runDir,
});
const completedAt = new Date().toISOString();
const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";
const exitCode = result.status ?? 1;

writeText(path.join(runDir, "stdout.log"), stdout);
writeText(path.join(runDir, "stderr.log"), stderr);

const output = {
  runId: manifest.runId,
  manifestId: manifest.manifestId,
  manifestPath,
  buildStartedAt,
  buildCompletedAt,
  dockerBuildCommand: ["docker", ...dockerBuildArgs],
  startedAt,
  completedAt,
  dockerCommand: ["docker", ...dockerArgs],
  status: exitCode === 0 ? "passed" : "failed",
  exitCode,
  stdoutPath: path.join(runDir, "stdout.log"),
  stderrPath: path.join(runDir, "stderr.log"),
  artifacts: collectKnownArtifacts(runDir, workspaceDir),
};

writeJson(path.join(runDir, "docker-result.json"), output);
console.log(JSON.stringify(output, null, 2));
process.exit(exitCode === 0 ? 0 : 1);
