import { Type } from "@sinclair/typebox";
import { buildResearchPluginSummary } from "../services/plugin-architecture.js";

export function createResearchStatusTool() {
  return {
    name: "research_plugin_status",
    description: "Summarize the current plugin-first scientific workflow roadmap.",
    parameters: Type.Object({
      includeMilestones: Type.Optional(
        Type.Boolean({
          description: "Whether to include the next milestone list.",
        }),
      ),
    }),
    async execute(_invocationId: string, params: { includeMilestones?: boolean }) {
      const summary = buildResearchPluginSummary();
      const payload =
        params.includeMilestones === false
          ? {
              pluginId: summary.pluginId,
              strategy: summary.strategy,
              decisions: summary.decisions,
              phases: summary.phases,
            }
          : summary;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  };
}

