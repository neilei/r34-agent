import { evaluateStructurePresentationPrompt } from "../prompts/evaluate-structure-presentation";
import {
  createEvaluationNode,
  createEvaluationSchema,
} from "./evaluation-utils";

const structurePreservationEvaluationSchema = createEvaluationSchema(
  "structurePreservation"
);

export const evaluateStructurePreservationNode = createEvaluationNode({
  nodeName: "STRUCTURE_PRESERVATION_EVALUATION",
  scoreKey: "structurePreservationScore",
  feedbackKey: "structurePreservationScore",
  schemaKey: "structurePreservation",
  prompt: evaluateStructurePresentationPrompt,
  schema: structurePreservationEvaluationSchema,
});
