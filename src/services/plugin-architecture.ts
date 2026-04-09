import type { ResearchModuleId } from "../contracts/research-contracts.js";
import { ENGINEERING_DECISIONS, RESEARCH_PLUGIN_PHASES } from "../plugin-goals.js";

export function buildResearchPluginSummary() {
  return {
    pluginId: "research-plugin",
    strategy: "plugin-first",
    currentStage: "phase-1-minimal-loop",
    decisions: [...ENGINEERING_DECISIONS],
    registeredModules: [
      "paper_ingest",
      "task_orchestrator",
      "code_generator",
      "sandbox_run",
      "validator",
      "trace_recorder",
      "report_build",
      "vtkjs_validate",
    ] satisfies ResearchModuleId[],
    phases: RESEARCH_PLUGIN_PHASES.map((phase) => ({
      id: phase.id,
      title: phase.title,
    })),
    nextMilestones: [
      "Replace simulated sandbox with Docker and cloud adapters",
      "Add real paper search and multi-document RAG retrieval",
      "Persist task graph snapshots and trace history",
      "Emit structured progress updates for Dashboard and Task Flow",
    ],
  };
}
