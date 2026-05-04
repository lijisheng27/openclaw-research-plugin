import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const pageUrl = "http://127.0.0.1:4173/index.html";
const canvasSelector = "canvas";
const timeoutMs = 15000;

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
    fs.writeFileSync(consolePath, JSON.stringify(consoleEntries, null, 2) + "\n", "utf-8");
    fs.writeFileSync(pageErrorPath, JSON.stringify(pageErrors, null, 2) + "\n", "utf-8");
    const report = {
      pageUrl,
      canvasSelector,
      canvasFound,
      consoleErrorCount: consoleEntries.filter((entry) => entry.type === "error").length,
      pageErrorCount: pageErrors.length,
      screenshotPath: "artifacts/render-screenshot.png",
      verdict: canvasFound && pageErrors.length === 0 ? "accepted" : "needs_revision",
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf-8");
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
    ) + "\n",
    "utf-8",
  );
  console.error(error);
  process.exit(1);
});
