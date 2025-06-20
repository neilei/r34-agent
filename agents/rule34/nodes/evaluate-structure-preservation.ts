import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { VENICE_API_KEY, VENICE_BASE_URL } from "../config";
import { evaluateStructurePresentationPrompt } from "../prompts/evaluate-structure-presentation";
import { GraphState } from "../rule34-text-graph";

// LLM configuration for evaluation
const evaluationLlm = new ChatOpenAI({
  modelName: "venice-uncensored",
  openAIApiKey: VENICE_API_KEY,
  configuration: {
    baseURL: VENICE_BASE_URL,
  },
  temperature: 0.3,
  maxTokens: 2500,
});

// Zod schema for structure preservation evaluation output
const structurePreservationEvaluationSchema = z.object({
  structurePreservation: z.object({
    score: z.number().min(0).max(10),
    rationale: z.string(),
    whatIsWorkingWell: z.array(z.string()),
    whatNeedsImprovement: z.array(z.string()),
    specificSuggestions: z.array(z.string()),
  }),
});

// Define the structure preservation evaluation node
export const evaluateStructurePreservationNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(
    `---STRUCTURE PRESERVATION EVALUATION NODE (Iteration ${
      state.iteration - 1
    })---`
  );

  if (!state.rewrittenText || !state.originalText) {
    const feedback = {
      horniness: state.feedback?.horniness || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      kinkInclusion: state.feedback?.kinkInclusion || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      contentPreservationScore: state.feedback?.contentPreservationScore || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      structurePreservationScore: {
        whatIsWorkingWell: [
          "Missing rewritten text or original text for evaluation",
        ],
        whatNeedsImprovement: ["Cannot evaluate without proper input text"],
        specificSuggestions: [
          "Ensure both original and rewritten text are provided",
        ],
      },
    };

    return {
      structurePreservationScore: 0,
      feedback,
    };
  }

  const formattedPrompt = evaluateStructurePresentationPrompt
    .replace("{{ORIGINAL_TEXT}}", state.originalText)
    .replace("{{REWRITTEN_TEXT}}", state.rewrittenText);

  try {
    const structuredLlm = evaluationLlm.withStructuredOutput(
      structurePreservationEvaluationSchema,
      {
        name: "evaluateStructurePreservation",
      }
    );

    const evaluation = await structuredLlm.invoke(formattedPrompt);

    console.log(
      `Structure Preservation Score: ${evaluation.structurePreservation.score}/10`
    );
    console.log(
      `Structure Preservation Feedback: ${JSON.stringify(
        evaluation.structurePreservation,
        null,
        2
      )}`
    );

    const feedback = {
      horniness: state.feedback?.horniness || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      kinkInclusion: state.feedback?.kinkInclusion || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      contentPreservationScore: state.feedback?.contentPreservationScore || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      structurePreservationScore: {
        whatIsWorkingWell: evaluation.structurePreservation
          .whatIsWorkingWell || ["No positive feedback provided"],
        whatNeedsImprovement: evaluation.structurePreservation
          .whatNeedsImprovement || ["No improvement areas identified"],
        specificSuggestions: evaluation.structurePreservation
          .specificSuggestions || ["No specific suggestions provided"],
      },
    };

    return {
      structurePreservationScore: evaluation.structurePreservation.score,
      feedback,
    };
  } catch (error) {
    console.error("Error evaluating structure preservation:", error);
    const feedback = {
      horniness: state.feedback?.horniness || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      kinkInclusion: state.feedback?.kinkInclusion || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      contentPreservationScore: state.feedback?.contentPreservationScore || {
        whatIsWorkingWell: [],
        whatNeedsImprovement: [],
        specificSuggestions: [],
      },
      structurePreservationScore: {
        whatIsWorkingWell: ["Error occurred during evaluation"],
        whatNeedsImprovement: ["Error occurred during evaluation"],
        specificSuggestions: [
          `Error evaluating structure preservation: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
      },
    };

    return {
      structurePreservationScore: 0,
      feedback,
    };
  }
};
