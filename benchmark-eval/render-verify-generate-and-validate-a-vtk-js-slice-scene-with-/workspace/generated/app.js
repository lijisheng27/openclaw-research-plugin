const vtk = globalThis.vtk;
if (!vtk) {
  throw new Error("vtk runtime not loaded on globalThis.");
}
const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
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
renderWindow.render();
