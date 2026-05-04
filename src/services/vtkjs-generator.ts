import type { TaskTemplateId, VtkjsGenerationBrief, VtkjsRetrieveContextOutput } from "../contracts/research-contracts.js";
import { createStableId } from "./research-utils.js";
import { retrieveVtkjsContext } from "./vtkjs-knowledge.js";

interface VtkjsGenerationBriefParams {
  goal: string;
  title?: string;
  abstract?: string;
  templateId?: TaskTemplateId;
  storePath?: string;
  limit?: number;
  topK?: number;
  context?: VtkjsRetrieveContextOutput;
}

function inferSceneKind(query: string): VtkjsGenerationBrief["sceneKind"] {
  const normalized = query.toLowerCase();
  if (normalized.includes("mag-iso") || normalized.includes("mag iso") || normalized.includes("isosurface")) {
    return "mag_iso";
  }
  if (normalized.includes("volume")) {
    return "volume";
  }
  if (normalized.includes("slice")) {
    return "slice";
  }
  if (normalized.includes("streamline")) {
    return "streamline";
  }
  if (normalized.includes("benchmark") || normalized.includes("mag-iso")) {
    return "benchmark";
  }
  return "generic";
}

function buildStarterScript(sceneKind: VtkjsGenerationBrief["sceneKind"]) {
  switch (sceneKind) {
    case "mag_iso":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({
  background: [0.09, 0.1, 0.15],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

// Replace this bootstrap with iso-value selection, contour extraction, and a surface actor.
renderer.resetCamera();
renderWindow.render();
`;
    case "volume":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({
  background: [0.08, 0.1, 0.14],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

// Replace this bootstrap with real volume data, transfer functions, and a volume mapper.
renderer.resetCamera();
renderWindow.render();
`;
    case "slice":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

// Replace this bootstrap with image data, slice mapper wiring, and viewport constraints.
renderer.resetCamera();
renderWindow.render();
`;
    case "streamline":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

// Replace this bootstrap with seed generation, vector-field input wiring, and streamline actors.
renderer.resetCamera();
renderWindow.render();
`;
    case "benchmark":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

// Keep the benchmark case minimal and deterministic before adding task-specific complexity.
renderer.resetCamera();
renderWindow.render();
`;
    case "generic":
    default:
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
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
}

function buildAcceptanceChecks(sceneKind: VtkjsGenerationBrief["sceneKind"]) {
  const shared = [
    "The scene should create a visible canvas during browser verification.",
    "The script should end with renderer.resetCamera() followed by renderWindow.render().",
    "Browser evidence should include render-verification.json, browser-console.json, page-errors.json, and render-screenshot.png.",
    "The browser console and page error logs should stay free of runtime errors.",
  ];

  switch (sceneKind) {
    case "mag_iso":
      return [
        ...shared,
        "The generated mag-iso workflow should make iso-value or contour extraction intent explicit.",
      ];
    case "volume":
      return [
        ...shared,
        "The generated volume workflow should make mapper plus transfer-function setup explicit.",
      ];
    case "slice":
      return [
        ...shared,
        "The generated slice workflow should make image-data and slice-mapper setup explicit.",
      ];
    case "streamline":
      return [
        ...shared,
        "The generated streamline workflow should make seed generation and vector-field wiring explicit.",
      ];
    case "benchmark":
      return [
        ...shared,
        "The generated case should stay deterministic enough for later benchmark comparison.",
      ];
    case "generic":
    default:
      return shared;
  }
}

export function buildVtkjsGenerationBrief(params: VtkjsGenerationBriefParams): VtkjsGenerationBrief {
  const query = [params.goal, params.title ?? "", params.abstract ?? ""].join(" ").trim();
  const templateId = params.templateId ?? "vtkjs_scene_validation";
  const context =
    params.context ??
    retrieveVtkjsContext({
      query,
      limit: params.limit,
      topK: params.topK,
      storePath: params.storePath,
    });
  const sceneKind = inferSceneKind(query);
  const starterScript = buildStarterScript(sceneKind);
  const acceptanceChecks = buildAcceptanceChecks(sceneKind);

  return {
    briefId: createStableId("vtkjs-brief", `${query}-${sceneKind}`),
    query,
    templateId,
    sceneKind,
    contextSummary: context.contextPack.summary,
    recommendedPatterns: context.recommendedPatterns,
    failureFixPairs: context.failureFixPairs,
    generationPrompt: [
      "Generate vtk.js code for the requested scene while preserving a deterministic browser-validation path.",
      `Scene kind: ${sceneKind}.`,
      `Use these retrieval-backed patterns: ${context.recommendedPatterns.join(" | ")}.`,
      `Avoid regressions captured by these failure-fix hints: ${context.failureFixPairs.join(" | ")}.`,
      `Acceptance contract: ${acceptanceChecks.join(" | ")}.`,
    ].join(" "),
    starterScript,
    acceptanceChecks,
  };
}
