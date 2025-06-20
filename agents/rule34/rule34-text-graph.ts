import { Annotation, StateGraph } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { evaluateContentPreservationNode } from "./nodes/evaluate-content-preservation";
import { evaluateHorninessNode } from "./nodes/evaluate-horniness";
import { evaluateKinkInclusionNode } from "./nodes/evaluate-kink-inclusion";
import { evaluateStructurePreservationNode } from "./nodes/evaluate-structure-preservation";
import { fetishInferenceNode } from "./nodes/fetish-inference";
import { generateRule34TextNode } from "./nodes/generate-rule34-text";

export const GraphStateAnnotation = Annotation.Root({
  requestId: Annotation<string>,
  sessionId: Annotation<string>,
  originalText: Annotation<string>,
  prompt: Annotation<string>,
  kinks: Annotation<string[]>({
    reducer: (curr, update) => update,
    default: () => [],
  }),
  kinksInferred: Annotation<boolean>({
    reducer: (curr, update) => update,
    default: () => false,
  }),
  maxIterations: Annotation<number>({
    reducer: (curr, update) => update,
    default: () => 3,
  }),
  minScores: Annotation<{
    horniness: number;
    kinkInclusion: number;
    contentPreservationScore: number;
    structurePreservationScore: number;
  }>({
    reducer: (curr, update) => update,
    default: () => ({
      horniness: 7,
      kinkInclusion: 7,
      contentPreservationScore: 7,
      structurePreservationScore: 7,
    }),
  }),
  veniceResponse: Annotation<string | undefined>,
  rewrittenText: Annotation<string | undefined>,
  rationale: Annotation<string | undefined>,
  feedback: Annotation<
    | {
        horniness: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        kinkInclusion: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        contentPreservationScore: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        structurePreservationScore: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
      }
    | undefined
  >({
    reducer: (current, updates) => {
      // If no current feedback, start with default structure
      const base = current || {
        horniness: {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        kinkInclusion: {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        contentPreservationScore: {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        structurePreservationScore: {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
      };

      // Merge all updates into the base
      const merged = { ...base };
      if (updates) {
        Object.assign(merged, updates);
      }

      return merged;
    },
    default: () => undefined,
  }),
  finalAnalysis: Annotation<string | undefined>,
  iteration: Annotation<number>({
    reducer: (curr, update) => update,
    default: () => 0,
  }),
  iterationHistory: Annotation<
    Array<{
      iteration: number;
      rewrittenText: string;
      rationale: string;
      feedback?: {
        horniness: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        kinkInclusion: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        contentPreservationScore: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        structurePreservationScore: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
      };
      horniness?: number;
      kinkInclusion?: number;
      contentPreservationScore?: number;
      structurePreservationScore?: number;
    }>
  >({
    reducer: (curr, update) => update,
    default: () => [],
  }),
  horniness: Annotation<number>,
  kinkInclusion: Annotation<number>,
  contentPreservationScore: Annotation<number>,
  structurePreservationScore: Annotation<number>,
});

export type GraphState = typeof GraphStateAnnotation.State;

// Function to determine next step after add_request_id
function shouldRunFetishInference(state: GraphState): string {
  // If kinks are already provided, go straight to venice node
  if (state.kinks.length > 0) {
    return "venice";
  }
  // Otherwise, go to fetish inference node
  return "fetish_inference";
}

// Function to determine whether to continue iterating or end after evaluation
function shouldContinueIterating(state: GraphState): string {
  // Check if we've reached the maximum number of iterations
  if (state.iteration >= state.maxIterations) {
    console.log(
      `Maximum iterations (${state.maxIterations}) reached. Ending process.`
    );
    return "end";
  }

  // Check score thresholds
  const minKinkInclusion = state.minScores.kinkInclusion;
  const minContentPreservationScore = state.minScores.contentPreservationScore;
  const minStructurePreservationScore =
    state.minScores.structurePreservationScore;
  const minHorniness = state.minScores.horniness;

  const meetsKinkThreshold = state.kinkInclusion >= minKinkInclusion;
  const meetsContentThreshold =
    state.contentPreservationScore >= minContentPreservationScore;
  const meetsStructureThreshold =
    state.structurePreservationScore >= minStructurePreservationScore;
  const meetsHorninessThreshold = state.horniness >= minHorniness;

  console.log(`Iteration ${state.iteration} scores:`);
  console.log(
    `  Kink Inclusion: ${state.kinkInclusion}/${minKinkInclusion} (${
      meetsKinkThreshold ? "PASS" : "FAIL"
    })`
  );
  console.log(
    `  Content Preservation: ${
      state.contentPreservationScore
    }/${minContentPreservationScore} (${
      meetsContentThreshold ? "PASS" : "FAIL"
    })`
  );
  console.log(
    `  Structure Preservation: ${
      state.structurePreservationScore
    }/${minStructurePreservationScore} (${
      meetsStructureThreshold ? "PASS" : "FAIL"
    })`
  );
  console.log(
    `  Horniness: ${state.horniness}/${minHorniness} (${
      meetsHorninessThreshold ? "PASS" : "FAIL"
    })`
  );

  // If all thresholds are met, end the process
  if (
    meetsKinkThreshold &&
    meetsContentThreshold &&
    meetsStructureThreshold &&
    meetsHorninessThreshold
  ) {
    console.log("All score thresholds met. Ending process.");
    return "end";
  }

  // Otherwise, continue iterating
  console.log("Score thresholds not met. Continuing iteration.");
  return "continue";
}

const addRequestIdNode = async (state: GraphState): Promise<GraphState> => {
  const requestId = uuidv4();
  return {
    ...state,
    requestId: requestId,
  };
};

// Consolidation node to update iteration history after all evaluations complete
const consolidateEvaluationsNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(
    `---CONSOLIDATING EVALUATIONS (Iteration ${state.iteration - 1})---`
  );

  // Update iteration history with all scores and feedback
  const updatedHistory = [...state.iterationHistory];
  if (updatedHistory.length > 0) {
    const lastIndex = updatedHistory.length - 1;
    updatedHistory[lastIndex] = {
      ...updatedHistory[lastIndex],
      feedback: state.feedback,
      horniness: state.horniness,
      kinkInclusion: state.kinkInclusion,
      contentPreservationScore: state.contentPreservationScore,
      structurePreservationScore: state.structurePreservationScore,
    };
  }

  console.log(
    `Updated iteration history with all scores for iteration ${
      state.iteration - 1
    }`
  );
  console.log(
    `Final Scores: Horniness: ${state.horniness}/10, Kink: ${state.kinkInclusion}/10, Content: ${state.contentPreservationScore}/10, Structure: ${state.structurePreservationScore}/10`
  );

  return {
    iterationHistory: updatedHistory,
  };
};

const workflow = new StateGraph(GraphStateAnnotation)
  .addNode("add_request_id", addRequestIdNode)
  .addNode("fetish_inference", fetishInferenceNode)
  .addNode("venice", generateRule34TextNode)
  .addNode("evaluate_horniness", evaluateHorninessNode)
  .addNode("evaluate_kink_inclusion", evaluateKinkInclusionNode)
  .addNode("evaluate_content_preservation", evaluateContentPreservationNode)
  .addNode("evaluate_structure_preservation", evaluateStructurePreservationNode)
  .addNode("consolidate_evaluations", consolidateEvaluationsNode)
  .addEdge("__start__", "add_request_id")
  .addConditionalEdges("add_request_id", shouldRunFetishInference, {
    fetish_inference: "fetish_inference",
    venice: "venice",
  })
  .addEdge("fetish_inference", "venice")
  .addEdge("venice", "evaluate_horniness")
  .addEdge("venice", "evaluate_kink_inclusion")
  .addEdge("venice", "evaluate_content_preservation")
  .addEdge("venice", "evaluate_structure_preservation")
  .addEdge("evaluate_horniness", "consolidate_evaluations")
  .addEdge("evaluate_kink_inclusion", "consolidate_evaluations")
  .addEdge("evaluate_content_preservation", "consolidate_evaluations")
  .addEdge("evaluate_structure_preservation", "consolidate_evaluations")
  .addConditionalEdges("consolidate_evaluations", shouldContinueIterating, {
    continue: "venice",
    end: "__end__",
  });

const graph = workflow.compile();

/**
 * Runs the Venice Graph for processing rule34 text
 * @param originalText The original text to process
 * @param kinks Optional kinks parameter as an array of strings
 * @param sessionId Session ID for tracking
 * @param maxIterations Maximum number of iterations (default: 3)
 * @param minScores Optional minimum score thresholds
 * @returns The processed result
 */
export async function runVeniceGraph(
  originalText: string,
  kinks: string[] = [],
  sessionId: string,
  maxIterations: number = 3,
  minScores?: {
    horniness: number;
    kinkInclusion: number;
    contentPreservationScore: number;
    structurePreservationScore: number;
  }
) {
  return await graph.invoke({
    sessionId,
    originalText,
    kinks,
    maxIterations,
    ...(minScores && { minScores }),
  });
}
