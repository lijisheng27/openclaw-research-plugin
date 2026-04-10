import type { ResearchModuleId } from "../contracts/research-contracts.js";
import { ENGINEERING_DECISIONS, RESEARCH_PLUGIN_PHASES } from "../plugin-goals.js";

export function buildResearchPluginSummary() {
  return {
    pluginId: "research-plugin",
    strategy: "plugin-first",
    currentStage: "phase-2-knowledge-layer",
    decisions: [...ENGINEERING_DECISIONS],
    registeredModules: [
      "paper_search",
      "knowledge_ingest",
      "rag_query",
      "context_pack_build",
      "knowledge_store_status",
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
      "Replace local paper fixtures with Arxiv, Crossref, or Scholar adapters",
      "Swap keyword retrieval for vector search plus rerank",
      "Persist task graph snapshots and trace history",
      "Emit structured progress updates for Dashboard and Task Flow",
    ],
  };
}
