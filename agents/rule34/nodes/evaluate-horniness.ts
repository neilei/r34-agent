import { evaluateHorninessPrompt } from "../prompts/evaluate-horniness";
import {
  createEvaluationNode,
  createEvaluationSchema,
} from "./evaluation-utils";

const horninessEvaluationSchema = createEvaluationSchema("horniness");

export const evaluateHorninessNode = createEvaluationNode({
  nodeName: "HORNINESS_EVALUATION",
  scoreKey: "horniness",
  feedbackKey: "horniness",
  schemaKey: "horniness",
  prompt: evaluateHorninessPrompt,
  schema: horninessEvaluationSchema,
});
