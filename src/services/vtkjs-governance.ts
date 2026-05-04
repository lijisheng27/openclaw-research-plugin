import type {
  Phase5ExecutionLoopOutput,
  Phase5RepairLoopOutput,
  Phase5RepairWorkflowPlan,
  TaskTemplateSelection,
  VtkjsCodeGenerationOutput,
  VtkjsGateDecision,
  VtkjsGenerationBrief,
  VtkjsLoopGovernance,
  VtkjsRetrieveContextOutput,
  VtkjsSubAgentPlan,
} from "../contracts/research-contracts.js";
import { createStableId } from "./research-utils.js";

interface BuildGovernanceParams {
  goal: string;
  selection: TaskTemplateSelection;
  vtkjsContext?: VtkjsRetrieveContextOutput;
  generationBrief?: VtkjsGenerationBrief;
  generatedCandidate?: VtkjsCodeGenerationOutput;
  phase5Execution: Phase5ExecutionLoopOutput;
  repairWorkflowPlan?: Phase5RepairWorkflowPlan;
  phase5Repair?: Phase5RepairLoopOutput;
  warnings: string[];
}

function scoreBoolean(value: boolean, weight: number) {
  return value ? weight : 0;
}

function decisionForScore(score: number): VtkjsGateDecision["decision"] {
  if (score >= 0.75) {
    return "pass";
  }
  if (score >= 0.45) {
    return "warn";
  }
  return "block";
}

function buildSubAgentPlan(isVtkjsRoute: boolean): VtkjsSubAgentPlan[] {
  if (!isVtkjsRoute) {
    return [];
  }

  return [
    {
      agentId: "module-retriever",
      role: "module_retriever",
      canRunInParallel: true,
      purpose: "Find vtk.js module and API coverage for the requested scene pipeline.",
      inputScope: ["goal", "template selection", "knowledge store"],
      outputContract: ["claims", "moduleCoverage", "risks", "recommendedPatterns"],
      writeScope: "read-only",
      termination: {
        maxSteps: 4,
        maxToolCalls: 3,
        stopWhen: ["required pipeline modules are covered", "three useful module claims are found"],
      },
    },
    {
      agentId: "example-retriever",
      role: "example_retriever",
      canRunInParallel: true,
      purpose: "Find reusable corpus examples and benchmark seeds with similar scene shape.",
      inputScope: ["goal", "sceneKind", "corpus manifest"],
      outputContract: ["claims", "exampleHits", "artifactPaths", "reuseRecommendation"],
      writeScope: "read-only",
      termination: {
        maxSteps: 4,
        maxToolCalls: 3,
        stopWhen: ["two relevant examples are found", "confidence is above 0.8"],
      },
    },
    {
      agentId: "error-retriever",
      role: "error_retriever",
      canRunInParallel: true,
      purpose: "Find known failure modes and repair hints before candidate generation.",
      inputScope: ["goal", "retrieval context", "failure-fix pairs"],
      outputContract: ["claims", "failurePatterns", "repairHints", "risks"],
      writeScope: "read-only",
      termination: {
        maxSteps: 4,
        maxToolCalls: 3,
        stopWhen: ["at least one relevant failure pattern is found", "no matching failures exist"],
      },
    },
    {
      agentId: "candidate-generator",
      role: "candidate_generator",
      canRunInParallel: true,
      purpose: "Generate conservative, context-backed, and fallback candidates for later verification.",
      inputScope: ["generation brief", "merged retrieval claims", "acceptance checks"],
      outputContract: ["candidateId", "html", "script", "staticRisk", "starterNotes"],
      writeScope: ".runs/{runId}/candidates/{candidateId}",
      termination: {
        maxSteps: 6,
        maxToolCalls: 2,
        stopWhen: ["complete HTML and script are produced", "candidate fails static completeness checks"],
      },
    },
    {
      agentId: "static-reviewer",
      role: "static_reviewer",
      canRunInParallel: true,
      purpose: "Reject candidates that are incomplete before paying Docker/Playwright verification cost.",
      inputScope: ["candidate html", "candidate script", "generation brief"],
      outputContract: ["candidateId", "acceptedForVerification", "risks", "evidence"],
      writeScope: "read-only",
      termination: {
        maxSteps: 3,
        maxToolCalls: 1,
        stopWhen: ["candidate gate decision is emitted"],
      },
    },
    {
      agentId: "render-verifier",
      role: "render_verifier",
      canRunInParallel: true,
      purpose: "Run Docker + Playwright verification for each accepted candidate.",
      inputScope: ["candidate html", "candidate script", "workflow input"],
      outputContract: ["verdict", "canvasFound", "consoleErrors", "pageErrors", "artifactPaths"],
      writeScope: ".runs/{runId}/verification/{candidateId}",
      termination: {
        maxSteps: 5,
        maxToolCalls: 2,
        stopWhen: ["render-verification.json is written", "timeout is reached"],
      },
    },
    {
      agentId: "repairer",
      role: "repairer",
      canRunInParallel: false,
      purpose: "Repair only after verification evidence identifies a concrete failure category.",
      inputScope: ["failed candidate", "browser evidence", "repair budget"],
      outputContract: ["repairCategory", "repairRound", "nextWorkflowInput", "retryHints"],
      writeScope: ".runs/{runId}/repair/round-{n}",
      termination: {
        maxSteps: 6,
        maxToolCalls: 3,
        stopWhen: ["repair proposal is emitted", "repair budget is exhausted"],
      },
    },
    {
      agentId: "corpus-curator",
      role: "corpus_curator",
      canRunInParallel: false,
      purpose: "Promote accepted candidates or failure-fix pairs into the corpus lifecycle.",
      inputScope: ["final verdict", "trace", "artifact summary", "repair history"],
      outputContract: ["promote", "entryType", "updatedFiles", "memoryDecision"],
      writeScope: "knowledge/vtkjs/{track}/{slug}",
      termination: {
        maxSteps: 4,
        maxToolCalls: 2,
        stopWhen: ["promotion decision is written"],
      },
    },
  ];
}

function gate(params: Omit<VtkjsGateDecision, "gateId">): VtkjsGateDecision {
  return {
    gateId: createStableId("vtkjs-gate", `${params.stage}-${params.evidence.join("|")}`),
    ...params,
  };
}

export function buildVtkjsLoopGovernance(params: BuildGovernanceParams): VtkjsLoopGovernance {
  const isVtkjsRoute = params.selection.templateId === "vtkjs_scene_validation";
  const hasContext = Boolean(params.vtkjsContext);
  const hasPatterns = (params.vtkjsContext?.recommendedPatterns.length ?? 0) > 0;
  const hasFailureHints = (params.vtkjsContext?.failureFixPairs.length ?? 0) > 0;
  const hasBrief = Boolean(params.generationBrief);
  const hasCandidate = Boolean(params.generatedCandidate?.html && params.generatedCandidate.script);
  const hasVerificationPlan = params.phase5Execution.routeKind === "vtkjs_render_verify";
  const hasRepairEvidence = Boolean(params.repairWorkflowPlan || params.phase5Repair);
  const repairAccepted = params.phase5Repair?.evidenceSummary?.verdict === "accepted";

  const intentScore = scoreBoolean(isVtkjsRoute, 0.7) + scoreBoolean(params.warnings.length === 0, 0.3);
  const contextScore = scoreBoolean(hasContext, 0.35) + scoreBoolean(hasPatterns, 0.35) + scoreBoolean(hasFailureHints, 0.3);
  const candidateScore = scoreBoolean(hasBrief, 0.35) + scoreBoolean(hasCandidate, 0.45) + scoreBoolean(hasVerificationPlan, 0.2);
  const verificationScore = scoreBoolean(hasVerificationPlan, 0.65) + scoreBoolean(Boolean(params.phase5Execution.renderVerify), 0.35);
  const repairScore = hasRepairEvidence ? scoreBoolean(Boolean(params.repairWorkflowPlan), 0.45) + scoreBoolean(Boolean(params.phase5Repair), 0.35) + scoreBoolean(repairAccepted, 0.2) : 1;
  const promotionScore = scoreBoolean(hasVerificationPlan, 0.35) + scoreBoolean(hasCandidate, 0.25) + scoreBoolean(repairAccepted || !hasRepairEvidence, 0.25) + scoreBoolean(hasContext, 0.15);

  const gates: VtkjsGateDecision[] = [
    gate({
      stage: "intent_gate",
      decision: decisionForScore(intentScore),
      valueScore: intentScore,
      evidence: [
        `templateId=${params.selection.templateId}`,
        `warnings=${params.warnings.length}`,
      ],
      feedback: isVtkjsRoute
        ? ["Route accepted for vtk.js Phase 5 governance."]
        : ["The request did not classify as vtk.js; keep the generic Phase 5 route."],
      nextAction: isVtkjsRoute ? "continue" : "ask_human",
    }),
    gate({
      stage: "spawn_gate",
      decision: isVtkjsRoute ? "pass" : "block",
      valueScore: isVtkjsRoute ? 0.9 : 0.1,
      evidence: [
        "parallel retriever, generator, reviewer, and verifier roles are independent until fan-in",
      ],
      feedback: [
        "Use read-only retrievers in parallel, then fan in on claims, risks, and artifact paths.",
        "Keep corpus promotion and final summary serial.",
      ],
      nextAction: isVtkjsRoute ? "spawn_subagents" : "ask_human",
    }),
    gate({
      stage: "context_gate",
      decision: decisionForScore(contextScore),
      valueScore: contextScore,
      evidence: [
        `hasContext=${hasContext}`,
        `recommendedPatterns=${params.vtkjsContext?.recommendedPatterns.length ?? 0}`,
        `failureFixPairs=${params.vtkjsContext?.failureFixPairs.length ?? 0}`,
      ],
      feedback: [
        hasPatterns ? "Context has reusable generation patterns." : "Retrieve or ingest more vtk.js examples before generation.",
        hasFailureHints ? "Failure-fix hints are available for repair-aware generation." : "No failure-fix hints were found; keep generated candidates conservative.",
      ],
      nextAction: contextScore >= 0.45 ? "continue" : "spawn_subagents",
    }),
    gate({
      stage: "candidate_gate",
      decision: decisionForScore(candidateScore),
      valueScore: candidateScore,
      evidence: [
        `hasGenerationBrief=${hasBrief}`,
        `hasCandidate=${hasCandidate}`,
        `routeKind=${params.phase5Execution.routeKind}`,
      ],
      feedback: [
        hasCandidate ? "Candidate includes complete HTML and script for browser validation." : "Generate at least one complete browser candidate before verification.",
      ],
      nextAction: hasCandidate ? "verify" : "spawn_subagents",
    }),
    gate({
      stage: "verification_gate",
      decision: decisionForScore(verificationScore),
      valueScore: verificationScore,
      evidence: [
        `routeKind=${params.phase5Execution.routeKind}`,
        `hasRenderVerifyPlan=${Boolean(params.phase5Execution.renderVerify)}`,
      ],
      feedback: [
        "Treat Docker + Playwright artifacts as the source of truth for pass/fail.",
        "Do not promote code based on natural-language self-assessment alone.",
      ],
      nextAction: hasVerificationPlan ? "verify" : "ask_human",
    }),
    gate({
      stage: "repair_gate",
      decision: decisionForScore(repairScore),
      valueScore: repairScore,
      evidence: [
        `hasRepairWorkflowPlan=${Boolean(params.repairWorkflowPlan)}`,
        `hasRepairLoop=${Boolean(params.phase5Repair)}`,
        `repairAccepted=${repairAccepted}`,
      ],
      feedback: hasRepairEvidence
        ? ["Repair is evidence-driven; stop after the configured budget or accepted verdict."]
        : ["No repair evidence was provided; skip repair until browser artifacts exist."],
      nextAction: hasRepairEvidence ? "repair" : "continue",
    }),
    gate({
      stage: "promotion_gate",
      decision: decisionForScore(promotionScore),
      valueScore: promotionScore,
      evidence: [
        `hasCandidate=${hasCandidate}`,
        `hasVerificationPlan=${hasVerificationPlan}`,
        `repairAcceptedOrNotNeeded=${repairAccepted || !hasRepairEvidence}`,
      ],
      feedback: [
        "Promote accepted candidates as stable corpus entries.",
        "Promote failed-but-diagnosed runs as error-fix pairs instead of stable candidates.",
      ],
      nextAction: promotionScore >= 0.75 ? "promote" : "discard",
    }),
  ];

  return {
    governanceId: createStableId("vtkjs-governance", `${params.goal}-${params.selection.templateId}`),
    parallelism: {
      enabled: isVtkjsRoute,
      maxConcurrentSubAgents: isVtkjsRoute ? 3 : 0,
      rationale: isVtkjsRoute
        ? [
            "Retrieval, candidate generation, static review, and candidate verification have independent input scopes.",
            "Fan-in is gated by structured claims, risks, artifacts, and verdict evidence.",
          ]
        : ["Parallel vtk.js sub-agents are disabled for non-vtk.js routes."],
    },
    subAgentPlan: buildSubAgentPlan(isVtkjsRoute),
    gates,
    fanInContract: {
      requiredFields: ["agentId", "role", "status", "confidence", "claims", "artifacts", "risks", "nextAction"],
      reducerPolicy: [
        "Merge claims only when they include evidence or confidence.",
        "Prefer browser artifact verdicts over natural-language candidate self-assessment.",
        "Reject candidates with high static risk before Docker verification.",
        "Keep final corpus writes serial through the corpus curator role.",
      ],
    },
    summaryContract: {
      valueJudgementFields: ["accepted", "reason", "evidence", "valueScore", "nextAction"],
      memoryDecisionFields: ["writeCorpus", "entryType", "promotedFiles", "failureType", "artifactSummary"],
    },
  };
}
