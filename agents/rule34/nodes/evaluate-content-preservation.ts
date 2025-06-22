import { evaluateContentPreservationPrompt } from "../prompts/evaluate-content-preservation";
import {
  createEvaluationNode,
  createEvaluationSchema,
} from "./evaluation-utils";

const contentPreservationEvaluationSchema = createEvaluationSchema(
  "contentPreservation"
);

export const evaluateContentPreservationNode = createEvaluationNode({
  nodeName: "CONTENT_PRESERVATION_EVALUATION",
  scoreKey: "contentPreservationScore",
  feedbackKey: "contentPreservationScore",
  schemaKey: "contentPreservation",
  prompt: evaluateContentPreservationPrompt,
  schema: contentPreservationEvaluationSchema,
});
