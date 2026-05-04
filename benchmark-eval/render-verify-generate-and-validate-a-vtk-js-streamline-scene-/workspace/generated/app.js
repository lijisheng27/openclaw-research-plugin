const vtk = globalThis.vtk;
if (!vtk) {
  throw new Error("vtk runtime not loaded on globalThis.");
}
const fullScreenRenderer = vtk.Rendering.Misc.vtkFullScreenRenderWindow.newInstance();
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
renderWindow.render();
