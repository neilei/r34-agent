import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { VENICE_API_KEY, VENICE_BASE_URL } from "../config";
import { evaluateContentPreservationPrompt } from "../prompts/evaluate-content-preservation";
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

// Zod schema for content preservation evaluation output
const contentPreservationEvaluationSchema = z.object({
  contentPreservation: z.object({
    score: z.number().min(0).max(10),
    rationale: z.string(),
    whatIsWorkingWell: z.array(z.string()),
    whatNeedsImprovement: z.array(z.string()),
    specificSuggestions: z.array(z.string()),
  }),
});

// Define the content preservation evaluation node
export const evaluateContentPreservationNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(
    `---CONTENT PRESERVATION EVALUATION NODE (Iteration ${
      state.iteration - 1
    })---`
  );

  if (!state.rewrittenText || !state.originalText) {
    return {
      contentPreservationScore: 0,
      feedback: {
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
        contentPreservationScore: {
          whatIsWorkingWell: [
            "Missing rewritten text or original text for evaluation",
          ],
          whatNeedsImprovement: ["Cannot evaluate without proper input text"],
          specificSuggestions: [
            "Ensure both original and rewritten text are provided",
          ],
        },
        structurePreservationScore: state.feedback
          ?.structurePreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
      },
    };
  }

  const formattedPrompt = evaluateContentPreservationPrompt
    .replace("{{ORIGINAL_TEXT}}", state.originalText)
    .replace("{{REWRITTEN_TEXT}}", state.rewrittenText);

  try {
    const structuredLlm = evaluationLlm.withStructuredOutput(
      contentPreservationEvaluationSchema,
      {
        name: "evaluateContentPreservation",
      }
    );

    const evaluation = await structuredLlm.invoke(formattedPrompt);

    console.log(
      `Content Preservation Score: ${evaluation.contentPreservation.score}/10`
    );
    console.log(
      `Content Preservation Feedback: ${JSON.stringify(
        evaluation.contentPreservation,
        null,
        2
      )}`
    );

    return {
      contentPreservationScore: evaluation.contentPreservation.score,
      feedback: {
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
        contentPreservationScore: {
          whatIsWorkingWell: evaluation.contentPreservation
            .whatIsWorkingWell || ["No positive feedback provided"],
          whatNeedsImprovement: evaluation.contentPreservation
            .whatNeedsImprovement || ["No improvement areas identified"],
          specificSuggestions: evaluation.contentPreservation
            .specificSuggestions || ["No specific suggestions provided"],
        },
        structurePreservationScore: state.feedback
          ?.structurePreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
      },
    };
  } catch (error) {
    console.error("Error evaluating content preservation:", error);
    return {
      contentPreservationScore: 0,
      feedback: {
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
        contentPreservationScore: {
          whatIsWorkingWell: ["Error occurred during evaluation"],
          whatNeedsImprovement: ["Error occurred during evaluation"],
          specificSuggestions: [
            `Error evaluating content preservation: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        },
        structurePreservationScore: state.feedback
          ?.structurePreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
      },
    };
  }
};
