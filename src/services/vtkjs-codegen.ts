import type {
  GeneratedCode,
  TaskTemplateId,
  VtkjsCodeGenerationOutput,
  VtkjsGenerationBrief,
  VtkjsRetrieveContextOutput,
} from "../contracts/research-contracts.js";
import { createStableId } from "./research-utils.js";
import { buildVtkjsGenerationBrief } from "./vtkjs-generator.js";

interface VtkjsCodegenParams {
  goal: string;
  title?: string;
  abstract?: string;
  templateId?: TaskTemplateId;
  storePath?: string;
  limit?: number;
  topK?: number;
  brief?: VtkjsGenerationBrief;
  context?: VtkjsRetrieveContextOutput;
}

function buildImports(sceneKind: VtkjsGenerationBrief["sceneKind"]) {
  const shared = [
    'import vtkFullScreenRenderWindow from "vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow";',
    'import vtkMapper from "vtk.js/Sources/Rendering/Core/Mapper";',
    'import vtkActor from "vtk.js/Sources/Rendering/Core/Actor";',
  ];

  switch (sceneKind) {
    case "mag_iso":
      return [
        ...shared,
        'import vtkConeSource from "vtk.js/Sources/Filters/Sources/ConeSource";',
      ].join("\n");
    case "volume":
      return [
        ...shared,
        'import vtkConeSource from "vtk.js/Sources/Filters/Sources/ConeSource";',
        'import vtkColorTransferFunction from "vtk.js/Sources/Rendering/Core/ColorTransferFunction";',
        'import vtkPiecewiseFunction from "vtk.js/Sources/Common/DataModel/PiecewiseFunction";',
      ].join("\n");
    case "slice":
      return [...shared, 'import vtkCubeSource from "vtk.js/Sources/Filters/Sources/CubeSource";'].join("\n");
    case "streamline":
      return [...shared, 'import vtkArrowSource from "vtk.js/Sources/Filters/Sources/ArrowSource";'].join("\n");
    case "benchmark":
      return [...shared, 'import vtkConeSource from "vtk.js/Sources/Filters/Sources/ConeSource";'].join("\n");
    case "generic":
    default:
      return [...shared, 'import vtkSphereSource from "vtk.js/Sources/Filters/Sources/SphereSource";'].join("\n");
  }
}

function buildTsSceneBody(sceneKind: VtkjsGenerationBrief["sceneKind"]) {
  switch (sceneKind) {
    case "mag_iso":
      return `  const source = vtkConeSource.newInstance({ height: 1.0, radius: 0.3, resolution: 42 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(source.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();

  return {
    scene: "mag-iso-scaffold",
    isoValue: 0.5,
    status: "rendered",
  };`;
    case "volume":
      return `  const source = vtkConeSource.newInstance({ height: 1.0, radius: 0.4, resolution: 48 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(source.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  renderer.addActor(actor);

  const colorTransfer = vtkColorTransferFunction.newInstance();
  colorTransfer.addRGBPoint(0, 0.1, 0.1, 0.2);
  colorTransfer.addRGBPoint(255, 0.95, 0.65, 0.2);

  const opacity = vtkPiecewiseFunction.newInstance();
  opacity.addPoint(0, 0.0);
  opacity.addPoint(255, 1.0);

  renderer.resetCamera();
  renderWindow.render();

  return {
    scene: "volume-scaffold",
    transferPoints: 2,
    opacityPoints: 2,
    status: "rendered",
  };`;
    case "slice":
      return `  const source = vtkCubeSource.newInstance({ xLength: 1.0, yLength: 0.05, zLength: 1.0 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(source.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();

  return {
    scene: "slice-scaffold",
    status: "rendered",
  };`;
    case "streamline":
      return `  const source = vtkArrowSource.newInstance({ tipResolution: 24, shaftResolution: 24 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(source.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();

  return {
    scene: "streamline-scaffold",
    status: "rendered",
  };`;
    case "benchmark":
      return `  const source = vtkConeSource.newInstance({ height: 1.0, radius: 0.35, resolution: 36 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(source.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();

  return {
    scene: "benchmark-scaffold",
    status: "rendered",
  };`;
    case "generic":
    default:
      return `  const source = vtkSphereSource.newInstance({ radius: 0.5, thetaResolution: 32, phiResolution: 32 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(source.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();

  return {
    scene: "generic-scaffold",
    status: "rendered",
  };`;
  }
}

function buildBrowserScript(sceneKind: VtkjsGenerationBrief["sceneKind"]) {
  switch (sceneKind) {
    case "mag_iso":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({
  background: [0.09, 0.1, 0.15],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const source = vtk.Filters.Sources.vtkConeSource.newInstance({
  height: 1.0,
  radius: 0.3,
  resolution: 42,
});
const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
mapper.setInputConnection(source.getOutputPort());
const actor = vtk.Rendering.Core.vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();`;
    case "volume":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance({
  background: [0.08, 0.1, 0.14],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const source = vtk.Filters.Sources.vtkConeSource.newInstance({
  height: 1.0,
  radius: 0.4,
  resolution: 48,
});
const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
mapper.setInputConnection(source.getOutputPort());
const actor = vtk.Rendering.Core.vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();`;
    case "slice":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const source = vtk.Filters.Sources.vtkCubeSource.newInstance({
  xLength: 1.0,
  yLength: 0.05,
  zLength: 1.0,
});
const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
mapper.setInputConnection(source.getOutputPort());
const actor = vtk.Rendering.Core.vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();`;
    case "streamline":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const source = vtk.Filters.Sources.vtkArrowSource.newInstance({
  tipResolution: 24,
  shaftResolution: 24,
});
const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
mapper.setInputConnection(source.getOutputPort());
const actor = vtk.Rendering.Core.vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();`;
    case "benchmark":
      return `const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const source = vtk.Filters.Sources.vtkConeSource.newInstance({
  height: 1.0,
  radius: 0.35,
  resolution: 36,
});
const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
mapper.setInputConnection(source.getOutputPort());
const actor = vtk.Rendering.Core.vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();`;
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
renderWindow.render();`;
  }
}

function buildHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>vtk.js Generated Scene</title>
    <link rel="icon" href="data:," />
  </head>
  <body>
    <div id="app"></div>
    <script src="/node_modules/vtk.js/vtk.js"></script>
    <script type="module" src="./generated/app.js"></script>
  </body>
</html>
`;
}

function buildGeneratedCode(brief: VtkjsGenerationBrief): GeneratedCode {
  const imports = buildImports(brief.sceneKind);
  const sceneBody = buildTsSceneBody(brief.sceneKind);
  const appCode = `${imports}

export function runExperiment() {
  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance();
  const renderer = fullScreenRenderer.getRenderer();
  const renderWindow = fullScreenRenderer.getRenderWindow();

${sceneBody}
}
`;

  return {
    language: "typescript",
    framework: "vtk.js",
    entrypoint: "src/generated/app.ts",
    summary: `vtk.js generated candidate for ${brief.sceneKind} scene`,
    files: [
      {
        path: "src/generated/app.ts",
        content: appCode,
      },
    ],
  };
}

export function generateVtkjsCode(params: VtkjsCodegenParams): VtkjsCodeGenerationOutput {
  const brief =
    params.brief ??
    buildVtkjsGenerationBrief({
      goal: params.goal,
      title: params.title,
      abstract: params.abstract,
      templateId: params.templateId,
      storePath: params.storePath,
      limit: params.limit,
      topK: params.topK,
      context: params.context,
    });
  const generatedCode = buildGeneratedCode(brief);
  const script = buildBrowserScript(brief.sceneKind);
  const html = buildHtml();

  return {
    generationId: createStableId("vtkjs-codegen", `${brief.query}-${brief.sceneKind}`),
    brief,
    generatedCode,
    html,
    script,
    sceneKind: brief.sceneKind,
    starterNotes: [
      "This generated candidate keeps a deterministic browser-validation path by default.",
      "The browser script is ready for Phase 5 render verification without additional bundling steps.",
      ...brief.acceptanceChecks.slice(0, 3),
    ],
  };
}
