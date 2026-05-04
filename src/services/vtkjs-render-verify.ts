import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  ExecutionArtifact,
  SandboxPolicyDecision,
  SandboxRunManifest,
  SandboxRunResult,
  VtkjsRenderVerifyOutput,
} from "../contracts/research-contracts.js";
import { createStableId, sanitizeDockerNameSegment } from "./research-utils.js";

interface VtkjsRenderVerifyParams {
  goal: string;
  html?: string;
  script?: string;
  artifactRoot?: string;
  requestedRuntime?: SandboxPolicyDecision["requestedRuntime"];
  canvasSelector?: string;
  timeoutMs?: number;
  execute?: boolean;
}

const PLAYWRIGHT_VERSION = "1.54.0";
const PLAYWRIGHT_IMAGE = `mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble`;

function getRunRoot(customPath?: string) {
  return path.resolve(customPath?.trim() || path.join(process.cwd(), ".research-runs"));
}

function sha256(content: string | Buffer) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf-8");
}

function buildContainerEntrypoint() {
  return [
    "mkdir -p /workspace",
    "cp -R /opt/render-verify/. /workspace",
    "cd /workspace",
    "node generated/render-verify.mjs",
  ].join(" && ");
}

function decideVtkjsSandboxPolicy(params: {
  code: string;
  requestedRuntime: SandboxPolicyDecision["requestedRuntime"];
}): SandboxPolicyDecision {
  const blockedReasons: string[] = [];
  if (params.requestedRuntime !== "docker") {
    blockedReasons.push("Phase 5 vtk.js render verification requires the Docker-backed browser workflow.");
  }
  if (/\b(rm\s+-rf|del\s+\/f|format\s+[a-z]:|shutdown\b)\b/i.test(params.code)) {
    blockedReasons.push("Potentially destructive shell content was detected in the generated scene payload.");
  }

  return {
    policyId: createStableId("policy", `${params.requestedRuntime}-${blockedReasons.join("|")}`),
    requestedRuntime: params.requestedRuntime,
    selectedRuntime: "docker",
    allowed: blockedReasons.length === 0,
    requiresStrongSandbox: true,
    blockedReasons,
    guidance: [
      "Run vtk.js browser verification inside Docker + Playwright.",
      "Treat browser artifacts as the acceptance source of truth.",
    ],
  };
}

function captureFileArtifact(params: {
  runDir: string;
  filePath: string;
  kind: ExecutionArtifact["kind"];
  summary: string;
}): ExecutionArtifact {
  const content = fs.readFileSync(params.filePath);
  return {
    artifactId: createStableId("artifact", params.filePath),
    kind: params.kind,
    path: path.relative(params.runDir, params.filePath).replaceAll("\\", "/"),
    summary: params.summary,
    sha256: sha256(content),
  };
}

function buildDefaultScript() {
  return `${buildScriptPrelude()}
const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({
  background: [0.12, 0.16, 0.22],
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
actor.getProperty().setColor(0.93, 0.54, 0.22);
renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();
`;
}

function buildScriptPrelude() {
  return `const vtk = globalThis.vtk;
if (!vtk) {
  throw new Error("vtk runtime not loaded on globalThis.");
}
`;
}

function buildHtml(params: { html?: string; scriptPath?: string }) {
  if (params.html) {
    return params.html;
  }

  const scriptTag = params.scriptPath
    ? `<script type="module" src="./${params.scriptPath.replaceAll("\\", "/")}"></script>`
    : `<script type="module">\n${buildDefaultScript()}\n</script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>vtk.js Render Verification</title>
    <link rel="icon" href="data:," />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #101726;
      }
      #app {
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script src="/node_modules/vtk.js/vtk.js"></script>
    ${scriptTag}
  </body>
</html>
`;
}

function buildRenderVerifyScript(params: { canvasSelector: string; pageUrl: string; timeoutMs: number }) {
  return `import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const pageUrl = ${JSON.stringify(params.pageUrl)};
const canvasSelector = ${JSON.stringify(params.canvasSelector)};
const timeoutMs = ${params.timeoutMs};

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
]);

function resolvePath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split("?")[0] || "/");
  const candidate = normalized === "/" ? "/index.html" : normalized;
  return path.join(rootDir, candidate);
}

const server = http.createServer((request, response) => {
  const filePath = resolvePath(request.url || "/");
  if (!filePath.startsWith(rootDir)) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  response.setHeader("Content-Type", mimeTypes.get(ext) || "application/octet-stream");
  response.end(fs.readFileSync(filePath));
});

const consoleEntries = [];
const pageErrors = [];
const screenshotPath = path.join(artifactsDir, "render-screenshot.png");
const consolePath = path.join(artifactsDir, "browser-console.json");
const pageErrorPath = path.join(artifactsDir, "page-errors.json");
const reportPath = path.join(artifactsDir, "render-verification.json");

async function main() {
  await new Promise((resolve) => server.listen(4173, "0.0.0.0", resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (message) => {
    consoleEntries.push({
      type: message.type(),
      text: message.text(),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
    });
  });

  let canvasFound = false;

  try {
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(1200);
    canvasFound = await page.locator(canvasSelector).count().then((count) => count > 0);
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } finally {
    fs.writeFileSync(consolePath, JSON.stringify(consoleEntries, null, 2) + "\\n", "utf-8");
    fs.writeFileSync(pageErrorPath, JSON.stringify(pageErrors, null, 2) + "\\n", "utf-8");
    const report = {
      pageUrl,
      canvasSelector,
      canvasFound,
      consoleErrorCount: consoleEntries.filter((entry) => entry.type === "error").length,
      pageErrorCount: pageErrors.length,
      screenshotPath: "artifacts/render-screenshot.png",
      verdict: canvasFound && pageErrors.length === 0 ? "accepted" : "needs_revision",
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\\n", "utf-8");
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }

  const hasConsoleError = consoleEntries.some((entry) => entry.type === "error");
  if (!canvasFound || pageErrors.length > 0 || hasConsoleError) {
    process.exit(1);
  }
}

main().catch((error) => {
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        pageUrl,
        canvasSelector,
        canvasFound: false,
        consoleErrorCount: consoleEntries.filter((entry) => entry.type === "error").length,
        pageErrorCount: pageErrors.length + 1,
        verdict: "needs_revision",
        failure: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ) + "\\n",
    "utf-8",
  );
  console.error(error);
  process.exit(1);
});
`;
}

export function buildVtkjsRenderVerifyPlan(params: VtkjsRenderVerifyParams): VtkjsRenderVerifyOutput {
  const canvasSelector = params.canvasSelector?.trim() || "canvas";
  const timeoutMs = Math.max(1000, params.timeoutMs ?? 15000);
  const pageUrl = "http://127.0.0.1:4173/index.html";
  const requestedRuntime = params.requestedRuntime ?? "docker";
  const sourceText = [params.goal, params.html ?? "", params.script ?? ""].join("\n");
  const policy = decideVtkjsSandboxPolicy({
    code: sourceText,
    requestedRuntime,
  });
  const verificationId = createStableId("render-verify", `${params.goal}-${Date.now()}`);
  const runDir = path.join(getRunRoot(params.artifactRoot), verificationId);
  const sourceDir = path.join(runDir, "workspace");
  const manifestPath = path.join(runDir, "sandbox-manifest.json");
  const htmlPath = path.join(sourceDir, "index.html");
  const scriptPath = params.script ? path.join(sourceDir, "generated", "app.js") : undefined;
  const renderVerifyPath = path.join(sourceDir, "generated", "render-verify.mjs");
  const dockerfilePath = path.join(sourceDir, "Dockerfile");
  const packageJsonPath = path.join(sourceDir, "package.json");
  const dockerIgnorePath = path.join(sourceDir, ".dockerignore");
  const artifactsDir = path.join(sourceDir, "artifacts");
  const stdoutPath = path.join(runDir, "stdout.log");
  const stderrPath = path.join(runDir, "stderr.log");
  const reportPath = path.join(artifactsDir, "render-verification.json");
  const consolePath = path.join(artifactsDir, "browser-console.json");
  const pageErrorPath = path.join(artifactsDir, "page-errors.json");
  const screenshotPath = path.join(artifactsDir, "render-screenshot.png");

  fs.mkdirSync(sourceDir, { recursive: true });

  if (scriptPath) {
    writeText(scriptPath, `${buildScriptPrelude()}${params.script ?? ""}`);
  }

  writeText(
    htmlPath,
    buildHtml({
      html: params.html,
      scriptPath: scriptPath ? path.relative(sourceDir, scriptPath) : undefined,
    }),
  );
  writeText(renderVerifyPath, buildRenderVerifyScript({ canvasSelector, pageUrl, timeoutMs }));
  writeJson(packageJsonPath, {
    name: `vtkjs-render-verify-${path.basename(runDir)}`,
    private: true,
    type: "module",
    dependencies: {
      playwright: PLAYWRIGHT_VERSION,
      "vtk.js": "^35.7.2",
    },
  });
  writeText(
    dockerIgnorePath,
    [
      "node_modules",
      "artifacts",
      "*.log",
      "docker-result.json",
      "sandbox-manifest.json",
    ].join("\n"),
  );
  writeText(
    dockerfilePath,
    `FROM ${PLAYWRIGHT_IMAGE}
WORKDIR /opt/render-verify
COPY package.json package.json
RUN npm install --no-fund --no-audit
COPY . .
CMD ["bash", "-lc", ${JSON.stringify(buildContainerEntrypoint())}]
`,
  );

  writeText(stdoutPath, [
    `Prepared vtk.js render verification bundle for goal: ${params.goal}`,
    `Page URL: ${pageUrl}`,
    `Canvas selector: ${canvasSelector}`,
    params.execute
      ? "Plugin execution remains dry-run only; use the external Docker runner to perform browser verification."
      : "Use the external Docker runner to perform browser verification.",
  ].join("\n"));
  writeText(stderrPath, "");
  writeJson(reportPath, {
    pageUrl,
    canvasSelector,
    canvasFound: false,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    verdict: "planned",
  });
  writeJson(consolePath, []);
  writeJson(pageErrorPath, []);

  const imageTag = `openclaw-research-plugin/${sanitizeDockerNameSegment(verificationId)}:local`;
  const containerEntrypoint = buildContainerEntrypoint();
  const dockerBuildCommand = ["build", "-t", imageTag, sourceDir];
  const dockerCommand = [
    "run",
    "--rm",
    "-v",
    `${sourceDir}:/workspace`,
    "-w",
    "/workspace",
    imageTag,
    "bash",
    "-lc",
    containerEntrypoint,
  ];

  const artifacts: ExecutionArtifact[] = [
    captureFileArtifact({
      runDir,
      filePath: htmlPath,
      kind: "source",
      summary: "Browser entry HTML for vtk.js render verification",
    }),
    captureFileArtifact({
      runDir,
      filePath: renderVerifyPath,
      kind: "source",
      summary: "Playwright-based render verification runner",
    }),
    captureFileArtifact({
      runDir,
      filePath: packageJsonPath,
      kind: "source",
      summary: "Render verification package manifest",
    }),
    captureFileArtifact({
      runDir,
      filePath: dockerIgnorePath,
      kind: "source",
      summary: "Render verification Docker ignore rules",
    }),
    captureFileArtifact({
      runDir,
      filePath: dockerfilePath,
      kind: "source",
      summary: "Render verification Dockerfile",
    }),
    captureFileArtifact({
      runDir,
      filePath: stdoutPath,
      kind: "stdout",
      summary: "Render verification planner stdout log",
    }),
    captureFileArtifact({
      runDir,
      filePath: stderrPath,
      kind: "stderr",
      summary: "Render verification planner stderr log",
    }),
    captureFileArtifact({
      runDir,
      filePath: reportPath,
      kind: "report",
      summary: "Render verification report placeholder",
    }),
  ];

  if (scriptPath) {
    artifacts.push(
      captureFileArtifact({
        runDir,
        filePath: scriptPath,
        kind: "source",
        summary: "Browser module script for vtk.js render verification",
      }),
    );
  }

  const sandboxRun: SandboxRunResult = {
    runId: verificationId,
    status: policy.allowed ? "passed" : "failed",
    runtime: "docker-adapter-dry-run",
    stdout: [
      `Prepared a browser-based vtk.js render verification bundle at ${sourceDir}.`,
      `docker ${dockerBuildCommand.join(" ")}`,
      `docker ${dockerCommand.join(" ")}`,
    ],
    stderr: policy.allowed ? [] : [...policy.blockedReasons],
    producedArtifacts: artifacts.map((artifact) => artifact.path),
    exitCode: policy.allowed ? 0 : 1,
  };

  const manifest: SandboxRunManifest = {
    manifestId: createStableId("manifest", verificationId),
    runId: verificationId,
    runtime: sandboxRun.runtime,
    environmentProfile: "node-vtk",
    image: PLAYWRIGHT_IMAGE,
    imageTag,
    command: ["bash", "-lc", containerEntrypoint],
    dockerfilePath,
    buildContextDir: sourceDir,
    dockerBuildCommand: ["docker", ...dockerBuildCommand],
    dockerCommand: ["docker", ...dockerCommand],
    manifestPath,
    runnerCommand: ["pnpm", "docker:sandbox", "--", manifestPath],
    workingDirectory: sourceDir,
    createdAt: new Date().toISOString(),
    artifacts,
    policy,
  };

  writeJson(manifestPath, manifest);

  return {
    verificationId,
    pageUrl,
    canvasSelector,
    timeoutMs,
    sandboxRun,
    manifest,
    expectedArtifacts: [
      "artifacts/render-verification.json",
      "artifacts/browser-console.json",
      "artifacts/page-errors.json",
      "artifacts/render-screenshot.png",
    ],
    runnerCommand: ["pnpm", "docker:sandbox", "--", manifestPath],
  };
}
