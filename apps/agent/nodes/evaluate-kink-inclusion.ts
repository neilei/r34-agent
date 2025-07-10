import { evaluateKinkInclusionPrompt } from "../prompts/evaluate-kink-inclusion";
import type { GraphState } from "../rule34-text-graph";
import {
  createEvaluationNode,
  createEvaluationSchema,
} from "./evaluation-utils";

const kinkInclusionEvaluationSchema = createEvaluationSchema("kinkInclusion");

export const evaluateKinkInclusionNode = createEvaluationNode({
  nodeName: "KINK_INCLUSION_EVALUATION",
  scoreKey: "kinkInclusion",
  feedbackKey: "kinkInclusion",
  schemaKey: "kinkInclusion",
  prompt: evaluateKinkInclusionPrompt,
  schema: kinkInclusionEvaluationSchema,
  extraPromptReplacements: (prompt: string, state: GraphState) => {
    return prompt.replace("{{KINKS}}", state.kinks.join(", "));
  },
});
