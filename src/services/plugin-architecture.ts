import { ENGINEERING_DECISIONS, RESEARCH_PLUGIN_PHASES } from "../plugin-goals.js";

export function buildResearchPluginSummary() {
  return {
    pluginId: "research-plugin",
    strategy: "plugin-first",
    decisions: [...ENGINEERING_DECISIONS],
    phases: RESEARCH_PLUGIN_PHASES.map((phase) => ({
      id: phase.id,
      title: phase.title,
    })),
    nextMilestones: [
      "Define orchestrator state contracts",
      "Split RAG storage from execution runtime",
      "Add validator adapters for Docker and cloud sandboxes",
      "Expose trace artifacts for dashboard and vtk.js consumers",
    ],
  };
}

